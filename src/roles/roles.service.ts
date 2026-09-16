import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma, RoleStatus } from '../generated/prisma/client';
import {
  PRIVILEGE_CATALOG,
  PRIVILEGE_GROUPS,
} from './privilege-catalog.constant';
import {
  CreateRoleRequestDto,
  GetRolesRequestDto,
  UpdateRoleRequestDto,
} from './dto';

@Injectable()
export class RolesService {
  // ==========================================
  // [LIVE IDE TOOL EDIT] RBAC Service Ready!
  // ==========================================

  constructor(private readonly prisma: PrismaService) {}

  // ── Privilege Catalog ──────────────────────────────────────────────────────

  getPrivilegeCatalog(search?: string) {
    const query = search?.trim().toLowerCase();

    const groups = PRIVILEGE_GROUPS.map((group) => {
      const privileges = PRIVILEGE_CATALOG.filter(
        (p) =>
          p.module === group.module &&
          (!query ||
            p.key.includes(query) ||
            p.description.toLowerCase().includes(query) ||
            group.label.toLowerCase().includes(query)),
      );
      return { module: group.module, label: group.label, privileges };
    }).filter((group) => group.privileges.length > 0);

    return {
      total: groups.reduce((sum, g) => sum + g.privileges.length, 0),
      groups,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async findRoleOrThrow(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { privileges: { include: { privilege: true } } },
    });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  /** Validates all supplied keys exist in the catalog. */
  private static readonly CATALOG_KEYS = new Set(
    PRIVILEGE_CATALOG.map((p) => p.key),
  );

  private assertPrivilegeKeysExist(keys: string[]): void {
    const catalogKeys = RolesService.CATALOG_KEYS;
    const invalid = keys.filter((k) => !catalogKeys.has(k));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid privilege key(s): ${invalid.join(', ')}`,
      );
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async listRoles(query?: GetRolesRequestDto) {
    const search = query?.search?.trim();
    const skip = query?.skip ?? 0;
    const take = query?.take ?? 10;

    const where: Prisma.RoleWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: { privileges: { include: { privilege: true } } },
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      result: roles.map((role) => this.toResponse(role)),
      total,
      skip,
      take,
    };
  }

  async getRole(id: number) {
    return this.toResponse(await this.findRoleOrThrow(id));
  }

  async createRole(dto: CreateRoleRequestDto) {
    this.assertPrivilegeKeysExist(dto.privilegeKeys);

    const existing = await this.prisma.role.count({
      where: { name: dto.name },
    });
    if (existing > 0) {
      throw new BadRequestException(
        `A role with name '${dto.name}' already exists`,
      );
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description ?? '',
        privileges: {
          create: dto.privilegeKeys.map((key) => ({
            privilege: { connect: { key } },
          })),
        },
      },
      include: { privileges: { include: { privilege: true } } },
    });

    return this.toResponse(role);
  }

  async updateRole(id: number, dto: UpdateRoleRequestDto) {
    const role = await this.findRoleOrThrow(id);

    if (role.isProtected && dto.name && dto.name !== role.name) {
      throw new BadRequestException(
        `Protected role '${role.name}' name cannot be modified`,
      );
    }

    if (dto.name && dto.name !== role.name) {
      const exists = await this.prisma.role.count({
        where: { name: dto.name, NOT: { id } },
      });
      if (exists > 0) {
        throw new BadRequestException(
          `A role with name '${dto.name}' already exists`,
        );
      }
    }

    if (dto.privilegeKeys) {
      this.assertPrivilegeKeysExist(dto.privilegeKeys);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.privilegeKeys) {
        // Full replace: remove all existing, re-link the new set
        await tx.rolePrivilege.deleteMany({ where: { roleId: id } });
      }

      return tx.role.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.privilegeKeys && {
            privileges: {
              create: dto.privilegeKeys.map((key) => ({
                privilege: { connect: { key } },
              })),
            },
          }),
        },
        include: { privileges: { include: { privilege: true } } },
      });
    });

    return this.toResponse(updated);
  }

  async setStatus(id: number, status: RoleStatus) {
    const role = await this.findRoleOrThrow(id);

    if (role.isProtected) {
      throw new BadRequestException(
        `Protected role '${role.name}' status cannot be changed`,
      );
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: { status },
      include: { privileges: { include: { privilege: true } } },
    });

    return this.toResponse(updated);
  }

  async deleteRole(id: number) {
    const role = await this.findRoleOrThrow(id);

    if (role.isProtected) {
      throw new BadRequestException(
        `Protected role '${role.name}' cannot be deleted`,
      );
    }

    const assignedUsers = await this.prisma.userRole.count({
      where: { roleId: id },
    });
    if (assignedUsers > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' — it is assigned to ${assignedUsers} user(s). Unassign all users first.`,
      );
    }

    // role_privilege rows cascade-deleted by DB (onDelete: Cascade)
    await this.prisma.role.delete({ where: { id } });

    return { message: `Role '${role.name}' deleted successfully` };
  }

  // ── Response shape ─────────────────────────────────────────────────────────

  private toResponse(
    role: Prisma.RoleGetPayload<{
      include: { privileges: { include: { privilege: true } } };
    }>,
  ) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      type: role.type,
      status: role.status,
      isProtected: role.isProtected,
      privileges: role.privileges.map((rp) => ({
        key: rp.privilege.key,
        module: rp.privilege.module,
        action: rp.privilege.action,
        description: rp.privilege.description,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
