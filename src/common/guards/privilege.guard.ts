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

    // Top-level Administrator always has full access to all system privileges
    if (user.type === UserType.Admin) {
      return true;
    }

    const privileges = await this.getUserPrivileges(user);

    const hasAny = requiredPrivileges.some((key) => privileges.has(key));
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
      for (const p of PRIVILEGE_CATALOG) {
        keys.add(p.key);
      }
    } else if (user.type === UserType.User) {
      const userRoles = await this.prisma.admin.findMany({
        where: { id: user.id },
        include: {
          role: {
            include: { privileges: { include: { privilege: true } } },
          },
        },
      });

      for (const ur of userRoles) {
        if (ur.role && (ur.role as any).status !== 'InActive') {
          for (const rp of ur.role.privileges) {
            if (rp.privilege?.key) keys.add(rp.privilege.key);
          }
        }
      }
    }

    await this.cacheManager.set(cacheKey, Array.from(keys), cacheTtl);
    return keys;
  }
}
