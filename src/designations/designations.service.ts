import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  HierarchyStatus,
  Prisma,
  UserStatus,
} from '../generated/prisma/client';
import {
  AssignUserDesignationDto,
  CreateDesignationDto,
  GetDesignationsDto,
  GetUserDesignationsDto,
  ReassignUserDesignationDto,
  UpdateDesignationDto,
} from './dto';

const ASSIGNMENT_INCLUDE = {
  user: {
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      username: true,
      profileImage: true,
    },
  },
  node: {
    select: {
      id: true,
      name: true,
      level: true,
      status: true,
      parentId: true,
    },
  },
  designation: {
    select: {
      id: true,
      name: true,
      level: true,
      status: true,
      description: true,
    },
  },
  reportingTo: {
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class DesignationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── 1. Designation Master Operations ─────────────────────────────────────────

  async create(dto: CreateDesignationDto) {
    const trimmedName = dto.name.trim();
    if (!trimmedName) {
      throw new BadRequestException('Designation name cannot be empty.');
    }
    const description =
      dto.description !== undefined ? dto.description.trim() : '';

    try {
      return await this.prisma.hierarchyDesignation.create({
        data: {
          name: trimmedName,
          level: dto.level,
          description,
          status: HierarchyStatus.Active,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          `Designation "${trimmedName}" already exists for level "${dto.level}".`,
        );
      }
      throw error;
    }
  }

  async findAll(filter: GetDesignationsDto) {
    const where: Prisma.HierarchyDesignationWhereInput = {};

    if (filter.search) {
      const search = filter.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (filter.level) {
      where.level = filter.level;
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const count = await this.prisma.hierarchyDesignation.count({ where });

    const skip = filter.skip ?? 0;
    const take = filter.take ?? 20;

    const data = await this.prisma.hierarchyDesignation.findMany({
      where,
      skip,
      take,
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    return {
      count,
      data,
    };
  }

  async findOne(id: number) {
    const designation = await this.prisma.hierarchyDesignation.findUnique({
      where: { id },
    });

    if (!designation) {
      throw new NotFoundException(`Designation with id ${id} not found.`);
    }

    return designation;
  }

  async update(id: number, dto: UpdateDesignationDto) {
    await this.findOne(id);

    const data: Prisma.HierarchyDesignationUpdateInput = {};
    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException('Designation name cannot be empty.');
      }
      data.name = trimmedName;
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim();
    }

    try {
      return await this.prisma.hierarchyDesignation.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          `Designation with name "${dto.name}" already exists for this level.`,
        );
      }
      throw error;
    }
  }

  async setStatus(id: number, status: HierarchyStatus) {
    await this.findOne(id);

    return this.prisma.hierarchyDesignation.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    const assignmentCount = await this.prisma.userHierarchyDesignation.count({
      where: { designationId: id },
    });

    if (assignmentCount > 0) {
      throw new BadRequestException(
        `Cannot delete designation because it is associated with ${assignmentCount} assignment record(s). Deactivate the designation instead to preserve assignment history.`,
      );
    }

    return this.prisma.hierarchyDesignation.delete({
      where: { id },
    });
  }

  // ─── 2. User-Designation Assignment Operations ───────────────────────────────

  async assignUser(dto: AssignUserDesignationDto) {
    // 1. Verify User exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${dto.userId} not found.`);
    }
    if (user.status !== UserStatus.Active) {
      throw new BadRequestException(
        `Cannot assign designation to a user with status "${user.status}". User must be Active.`,
      );
    }

    // 2. Verify HierarchyNode exists and is active
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id: dto.nodeId },
    });
    if (!node) {
      throw new NotFoundException(
        `Hierarchy node with id ${dto.nodeId} not found.`,
      );
    }
    if (node.status !== HierarchyStatus.Active) {
      throw new BadRequestException(
        `Cannot assign designation to an inactive hierarchy node ("${node.name}").`,
      );
    }

    // 3. Verify Designation exists and is active
    const designation = await this.prisma.hierarchyDesignation.findUnique({
      where: { id: dto.designationId },
    });
    if (!designation) {
      throw new NotFoundException(
        `Designation with id ${dto.designationId} not found.`,
      );
    }
    if (designation.status !== HierarchyStatus.Active) {
      throw new BadRequestException(
        `Cannot assign inactive designation ("${designation.name}"). Activate it first.`,
      );
    }

    // 4. LEVEL VALIDATION: Designation level must match HierarchyNode level
    if (designation.level !== node.level) {
      throw new BadRequestException(
        `Level mismatch: Designation "${designation.name}" is for level "${designation.level}", but Hierarchy Node "${node.name}" is at level "${node.level}". A designation can only be assigned to a hierarchy node of the same level.`,
      );
    }

    // 5. Check duplicate active assignment for the same user, node, and designation
    const existingActive = await this.prisma.userHierarchyDesignation.findFirst(
      {
        where: {
          userId: dto.userId,
          nodeId: dto.nodeId,
          designationId: dto.designationId,
          isActive: true,
        },
      },
    );

    if (existingActive) {
      throw new BadRequestException(
        `User "${user.firstname} ${user.lastname}" is already actively assigned as "${designation.name}" at "${node.name}" (Assignment ID: ${existingActive.id}).`,
      );
    }

    try {
      return await this.prisma.userHierarchyDesignation.create({
        data: {
          userId: dto.userId,
          nodeId: dto.nodeId,
          designationId: dto.designationId,
          reportingId: dto.reportingId ?? null,
          isActive: true,
          assignedAt: new Date(),
        },
        include: ASSIGNMENT_INCLUDE,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'An active assignment already exists for this user, node, and designation.',
        );
      }
      throw error;
    }
  }

  async findAllAssignments(filter: GetUserDesignationsDto) {
    const where: Prisma.UserHierarchyDesignationWhereInput = {};

    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.nodeId) {
      where.nodeId = filter.nodeId;
    }
    if (filter.designationId) {
      where.designationId = filter.designationId;
    }
    if (filter.isActive !== undefined) {
      where.isActive = filter.isActive;
    }
    if (filter.level) {
      where.designation = { level: filter.level };
    }

    if (filter.search) {
      const search = filter.search.trim();
      where.OR = [
        {
          user: {
            firstname: { contains: search, mode: 'insensitive' },
          },
        },
        {
          user: {
            lastname: { contains: search, mode: 'insensitive' },
          },
        },
        {
          user: {
            email: { contains: search, mode: 'insensitive' },
          },
        },
        {
          node: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
        {
          designation: {
            name: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const count = await this.prisma.userHierarchyDesignation.count({ where });

    const skip = filter.skip ?? 0;
    const take = filter.take ?? 20;

    const data = await this.prisma.userHierarchyDesignation.findMany({
      where,
      skip,
      take,
      orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
      include: ASSIGNMENT_INCLUDE,
    });

    return {
      count,
      data,
    };
  }

  async findAssignmentById(id: number) {
    const assignment = await this.prisma.userHierarchyDesignation.findUnique({
      where: { id },
      include: ASSIGNMENT_INCLUDE,
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with id ${id} not found.`);
    }

    return assignment;
  }

  // ─── 3. Current Responsibility Queries ───────────────────────────────────────

  async getUserActiveAssignments(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found.`);
    }

    return this.prisma.userHierarchyDesignation.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { assignedAt: 'desc' },
      include: ASSIGNMENT_INCLUDE,
    });
  }

  async getNodeActiveAssignments(nodeId: number) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id: nodeId },
    });
    if (!node) {
      throw new NotFoundException(
        `Hierarchy node with id ${nodeId} not found.`,
      );
    }

    return this.prisma.userHierarchyDesignation.findMany({
      where: {
        nodeId,
        isActive: true,
      },
      orderBy: { assignedAt: 'desc' },
      include: ASSIGNMENT_INCLUDE,
    });
  }

  // ─── 4. Reassign & Unassign (Concurrency-Safe & Atomic) ───────────────────────

  async reassign(dto: ReassignUserDesignationDto) {
    // 1. Pre-validate that new user exists and is active
    const newUser = await this.prisma.user.findUnique({
      where: { id: dto.newUserId },
    });
    if (!newUser) {
      throw new NotFoundException(`User with id ${dto.newUserId} not found.`);
    }
    if (newUser.status !== UserStatus.Active) {
      throw new BadRequestException(
        `Cannot reassign to a user with status "${newUser.status}". User must be Active.`,
      );
    }

    // 2. Fetch the existing assignment to identify node and designation
    const previous = await this.prisma.userHierarchyDesignation.findUnique({
      where: { id: dto.assignmentId },
      include: {
        node: true,
        designation: true,
      },
    });

    if (!previous) {
      throw new NotFoundException(
        `Assignment with id ${dto.assignmentId} not found.`,
      );
    }
    if (!previous.isActive) {
      throw new BadRequestException(
        `Assignment with id ${dto.assignmentId} is already inactive/closed. Only an active assignment can be reassigned.`,
      );
    }
    if (previous.userId === dto.newUserId) {
      throw new BadRequestException(
        `User with id ${dto.newUserId} is already assigned to this assignment position.`,
      );
    }

    const targetNodeId = previous.nodeId;
    const targetDesignationId = previous.designationId;

    // 3. Validate node is active
    if (previous.node.status !== HierarchyStatus.Active) {
      throw new BadRequestException(
        `Cannot reassign on an inactive hierarchy node ("${previous.node.name}").`,
      );
    }

    // 4. Validate designation is active
    if (previous.designation.status !== HierarchyStatus.Active) {
      throw new BadRequestException(
        `Cannot reassign an inactive designation ("${previous.designation.name}"). Activate it first.`,
      );
    }

    // 5. Level validation: designation.level === node.level
    if (previous.designation.level !== previous.node.level) {
      throw new BadRequestException(
        `Level mismatch: Designation "${previous.designation.name}" is of level "${previous.designation.level}", but Hierarchy Node "${previous.node.name}" is of level "${previous.node.level}". Both levels must match.`,
      );
    }

    // 6. Check if new user already has an active assignment for this user + node + designation
    const existingActive = await this.prisma.userHierarchyDesignation.findFirst(
      {
        where: {
          userId: dto.newUserId,
          nodeId: targetNodeId,
          designationId: targetDesignationId,
          isActive: true,
        },
      },
    );
    if (existingActive) {
      throw new BadRequestException(
        `User "${newUser.firstname} ${newUser.lastname}" is already actively assigned as "${previous.designation.name}" at "${previous.node.name}" (Assignment ID: ${existingActive.id}).`,
      );
    }

    const now = new Date();

    // 7. Execute atomic transaction:
    // Close the old assignment atomically using id AND isActive = true.
    // Verify exactly one active assignment was closed.
    // If count === 0, fail safely (concurrent request already closed it).
    // Then create the new active assignment.
    try {
      return await this.prisma.$transaction(async (tx) => {
        const closed = await tx.userHierarchyDesignation.updateMany({
          where: {
            id: dto.assignmentId,
            isActive: true,
          },
          data: {
            isActive: false,
            unassignedAt: now,
          },
        });

        if (closed.count === 0) {
          throw new BadRequestException(
            `Assignment with id ${dto.assignmentId} was already closed or unassigned by a concurrent request.`,
          );
        }

        return tx.userHierarchyDesignation.create({
          data: {
            userId: dto.newUserId,
            nodeId: targetNodeId,
            designationId: targetDesignationId,
            isActive: true,
            assignedAt: now,
          },
          include: ASSIGNMENT_INCLUDE,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'An active assignment already exists for this user, node, and designation.',
        );
      }
      throw error;
    }
  }

  async unassign(id: number) {
    const now = new Date();

    // Atomically close only if currently active
    const result = await this.prisma.userHierarchyDesignation.updateMany({
      where: {
        id,
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: now,
      },
    });

    if (result.count === 0) {
      const existing = await this.prisma.userHierarchyDesignation.findUnique({
        where: { id },
      });
      if (!existing) {
        throw new NotFoundException(`Assignment with id ${id} not found.`);
      }
      throw new BadRequestException(
        `Assignment with id ${id} is already inactive/unassigned.`,
      );
    }

    return this.findAssignmentById(id);
  }
}
