import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma } from '../generated/prisma/client';
import {
  CreateRoleRequestDto,
  GetRolesRequestDto,
  UpdateRoleRequestDto,
} from './dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE
  async create(dto: CreateRoleRequestDto) {
    const name = dto.name.trim().toUpperCase();

    const exists = await this.prisma.role.findUnique({
      where: { name },
    });

    if (exists) {
      throw new BadRequestException(`Role with name '${name}' already exists`);
    }

    const role = await this.prisma.role.create({
      data: {
        name,
        description: dto.description ? dto.description.trim() : '',
        isSystem: false,
      },
    });

    return role;
  }

  // FIND ALL
  async findAll(query?: GetRolesRequestDto) {
    const search = query?.search?.trim();
    const skip = query?.skip ?? 0;
    const take = query?.take ?? 10;

    const where: Prisma.RoleWhereInput = {};

    if (search) {
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      result: roles,
      total,
      skip,
      take,
    };
  }

  // FIND ONE
  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return role;
  }

  // UPDATE
  async update(id: number, dto: UpdateRoleRequestDto) {
    if (dto.name === undefined && dto.description === undefined) {
      throw new BadRequestException(
        'At least one field is required to update the role',
      );
    }

    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const updateData: { name?: string; description?: string } = {};

    if (dto.name) {
      const normalizedName = dto.name.trim().toUpperCase();

      if (role.isSystem && normalizedName !== role.name) {
        throw new BadRequestException(
          `System role '${role.name}' name cannot be modified`,
        );
      }

      if (normalizedName !== role.name) {
        const exists = await this.prisma.role.findUnique({
          where: { name: normalizedName },
        });

        if (exists && exists.id !== id) {
          throw new BadRequestException(
            `Role with name '${normalizedName}' already exists`,
          );
        }

        updateData.name = normalizedName;
      }
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description.trim();
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: updateData,
    });

    return {
      message: 'Role updated successfully',
      role: updated,
    };
  }

  // REMOVE
  async remove(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    if (role.isSystem) {
      throw new BadRequestException(
        `System role '${role.name}' cannot be deleted`,
      );
    }

    const assignedUsers = await this.prisma.userRole.count({
      where: { roleId: id },
    });

    if (assignedUsers > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because it is currently assigned to ${assignedUsers} user(s)`,
      );
    }

    const assignedPrivileges = await this.prisma.rolePrivilege.count({
      where: { roleId: id },
    });

    if (assignedPrivileges > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because it has ${assignedPrivileges} privilege(s) assigned to it`,
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return {
      message: 'Role deleted successfully',
    };
  }

  // GET ALL PRIVILEGES ASSIGNED TO A ROLE
  async getRolePrivileges(roleId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const rolePrivileges = await this.prisma.rolePrivilege.findMany({
      where: { roleId },
      include: {
        privilege: true,
      },
      orderBy: {
        privilegeId: 'asc',
      },
    });

    return {
      roleId: role.id,
      roleName: role.name,
      privileges: rolePrivileges.map((rp) => rp.privilege),
      total: rolePrivileges.length,
    };
  }

  // ASSIGN A PRIVILEGE TO A ROLE
  async assignPrivilege(roleId: number, privilegeId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const privilege = await this.prisma.privilege.findUnique({
      where: { id: privilegeId },
    });

    if (!privilege) {
      throw new NotFoundException(`Privilege with ID ${privilegeId} not found`);
    }

    const existingMapping = await this.prisma.rolePrivilege.findUnique({
      where: {
        roleId_privilegeId: {
          roleId,
          privilegeId,
        },
      },
    });

    if (existingMapping) {
      throw new BadRequestException(
        `Privilege '${privilege.key}' is already assigned to role '${role.name}'`,
      );
    }

    const mapping = await this.prisma.rolePrivilege.create({
      data: {
        roleId,
        privilegeId,
      },
      include: {
        privilege: true,
      },
    });

    return {
      message: `Privilege '${privilege.key}' assigned to role '${role.name}' successfully`,
      mapping,
    };
  }

  // REMOVE A PRIVILEGE FROM A ROLE
  async removePrivilege(roleId: number, privilegeId: number) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const privilege = await this.prisma.privilege.findUnique({
      where: { id: privilegeId },
    });

    if (!privilege) {
      throw new NotFoundException(`Privilege with ID ${privilegeId} not found`);
    }

    const mapping = await this.prisma.rolePrivilege.findUnique({
      where: {
        roleId_privilegeId: {
          roleId,
          privilegeId,
        },
      },
    });

    if (!mapping) {
      throw new NotFoundException(
        `Privilege with ID ${privilegeId} is not assigned to role with ID ${roleId}`,
      );
    }

    await this.prisma.rolePrivilege.delete({
      where: {
        roleId_privilegeId: {
          roleId,
          privilegeId,
        },
      },
    });

    return {
      message: `Privilege '${privilege.key}' removed from role '${role.name}' successfully`,
    };
  }
}
