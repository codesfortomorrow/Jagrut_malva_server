import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma';
import { REQUIRE_PRIVILEGE_KEY } from '../decorators';
import { AuthenticatedUser, UserType } from '../types';

@Injectable()
export class PrivilegeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
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

    if (!user || !user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const userPrivileges = await this.getUserPrivileges(user);

    const hasPrivilege = requiredPrivileges.some((privilege) =>
      userPrivileges.has(privilege),
    );

    if (!hasPrivilege) {
      throw new ForbiddenException('Access denied: insufficient privileges');
    }

    return true;
  }

  private async getUserPrivileges(
    user: AuthenticatedUser,
  ): Promise<Set<string>> {
    const privilegeKeys = new Set<string>();

    if (user.type === UserType.User) {
      const userRoles = await this.prisma.userRole.findMany({
        where: { userId: user.id },
        include: {
          role: {
            include: {
              privileges: {
                include: {
                  privilege: true,
                },
              },
            },
          },
        },
      });

      for (const ur of userRoles) {
        for (const rp of ur.role.privileges) {
          if (rp.privilege?.key) {
            privilegeKeys.add(rp.privilege.key);
          }
        }
      }
    } else if (user.type === UserType.Admin) {
      const adminRole = await this.prisma.role.findUnique({
        where: { name: 'ADMIN' },
        include: {
          privileges: {
            include: {
              privilege: true,
            },
          },
        },
      });

      if (adminRole) {
        for (const rp of adminRole.privileges) {
          if (rp.privilege?.key) {
            privilegeKeys.add(rp.privilege.key);
          }
        }
      }
    }

    return privilegeKeys;
  }
}
