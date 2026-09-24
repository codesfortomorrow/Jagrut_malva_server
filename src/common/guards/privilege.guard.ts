import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma';
import { REQUIRE_PRIVILEGE_KEY } from '../decorators';
import { AuthenticatedUser, UserType } from '../types';
import {
  ADMIN_ROLE_NAME,
  PRIVILEGE_CATALOG,
  resolvePrivilegeKeys,
} from '../../roles/privilege-catalog.constant';

export const getPrivilegeGuardCacheKey = (user: { id: number; type: string }) =>
  `${user.type}-${user.id}-privileges`.toLowerCase();

@Injectable()
export class PrivilegeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPrivileges = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PRIVILEGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPrivileges || requiredPrivileges.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    // NOTE: no UserType.Admin bypass here anymore.
    // Every admin-type account (Admin User, Manager, Editor, Org Member)
    // must go through its actual assigned Role's privileges below.
    // Only the ADMIN *role* (checked inside getUserPrivileges) gets full access.

    const privileges = await this.getUserPrivileges(user);

    const hasAny = requiredPrivileges.some((reqKey) => {
      const candidates = resolvePrivilegeKeys(reqKey);
      return candidates.some((k) => privileges.has(k));
    });
    if (!hasAny) {
      throw new ForbiddenException('Access denied: insufficient privileges');
    }

    return true;
  }

  private async getUserPrivileges(
    user: AuthenticatedUser,
  ): Promise<Set<string>> {
    const cacheKey = getPrivilegeGuardCacheKey(user);
    const cacheTtl = 300000; // 5 minutes cache

    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return new Set(cached);
    }

    const keys = new Set<string>();

    if (user.type === UserType.Admin) {
      // Admin-type accounts (Admin User, Manager, Editor, Org Member) all
      // live in the Admin model and carry exactly one Role.
      const admin = await this.prisma.admin.findUnique({
        where: { id: user.id },
        include: {
          role: {
            include: { privileges: { include: { privilege: true } } },
          },
        },
      });

      if (admin?.role && (admin.role as any).status !== 'InActive') {
        const roleName = admin.role.name?.trim().toUpperCase();
        if (
          roleName === ADMIN_ROLE_NAME.toUpperCase() ||
          roleName === 'ADMIN'
        ) {
          // Only the actual ADMIN role gets every privilege in the catalog.
          for (const p of PRIVILEGE_CATALOG) {
            keys.add(p.key);
            for (const alias of resolvePrivilegeKeys(p.key)) {
              keys.add(alias);
            }
          }
        } else {
          for (const rp of admin.role.privileges) {
            if (rp.privilege?.key) {
              keys.add(rp.privilege.key);
              for (const alias of resolvePrivilegeKeys(rp.privilege.key)) {
                keys.add(alias);
              }
            }
          }
        }
      }
    } else if (user.type === UserType.User) {
      // Consumer/mobile app users have no role system — no privileges.
    }

    await this.cacheManager.set(cacheKey, Array.from(keys), cacheTtl);
    return keys;
  }
}
