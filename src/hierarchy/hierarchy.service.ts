import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  HierarchyLevel,
  HierarchyStatus,
  UserStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHierarchyNodeDto } from './dto/create-hierarchy-node.dto';
import { UpdateHierarchyNodeDto } from './dto/update-hierarchy-node.dto';
import { GetHierarchyNodesDto } from './dto/get-hierarchy-nodes.dto';

const LEVEL_ORDER: HierarchyLevel[] = [
  HierarchyLevel.Prant,
  HierarchyLevel.Vibhag,
  HierarchyLevel.Jila,
  HierarchyLevel.Khand,
  HierarchyLevel.Mandal,
  HierarchyLevel.Gram,
];

/** Each level's required parent level — Prant has no entry (root) */
const REQUIRED_PARENT_LEVEL: Partial<Record<HierarchyLevel, HierarchyLevel>> = {
  [HierarchyLevel.Vibhag]: HierarchyLevel.Prant,
  [HierarchyLevel.Jila]: HierarchyLevel.Vibhag,
  [HierarchyLevel.Khand]: HierarchyLevel.Jila,
  [HierarchyLevel.Mandal]: HierarchyLevel.Khand,
  [HierarchyLevel.Gram]: HierarchyLevel.Mandal,
};

@Injectable()
export class HierarchyService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id },
    });

    if (!node) {
      throw new NotFoundException(`Hierarchy node with id ${id} not found`);
    }

    return node;
  }

  async getTree() {
    const nodes = await this.prisma.hierarchyNode.findMany({
      orderBy: { id: 'asc' },
    });

    const buildTree = (parentId: number | null = null): any[] =>
      nodes
        .filter((n) => (n.parentId ?? null) === parentId)
        .map((n) => ({
          id: n.id,
          name: n.name,
          level: n.level,
          levelOrder: LEVEL_ORDER.indexOf(n.level),
          status: n.status,
          description: n.description,
          parentId: n.parentId,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
          children: buildTree(n.id),
        }));

    return { tree: buildTree() };
  }

  async findAll(filter: GetHierarchyNodesDto) {
    const where: any = {};

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search.trim(), mode: 'insensitive' } },
        {
          description: { contains: filter.search.trim(), mode: 'insensitive' },
        },
      ];
    }
    if (filter.level) where.level = filter.level;
    if (filter.status) where.status = filter.status;
    if (filter.parentId !== undefined) {
      where.parentId = Number(filter.parentId) || null;
    }

    const count = await this.prisma.hierarchyNode.count({ where });

    const skip = filter.skip ?? 0;
    const take = filter.take ?? 20;

    const data = await this.prisma.hierarchyNode.findMany({
      where,
      skip,
      take,
      orderBy: [{ level: 'asc' }, { id: 'asc' }],
    });

    return { count, skip, take, data };
  }

  async getChildren(id: number) {
    await this.findOne(id);

    const data = await this.prisma.hierarchyNode.findMany({
      where: { parentId: id },
      orderBy: { id: 'asc' },
    });

    return { count: data.length, data };
  }

  async create(dto: CreateHierarchyNodeDto) {
    const requiredParentLevel = REQUIRED_PARENT_LEVEL[dto.level];

    if (!requiredParentLevel) {
      // Prant is root — no parent allowed, only one can exist
      if (dto.parentId) {
        throw new BadRequestException(
          `Prant is the root level and cannot have a parent node`,
        );
      }
      const existing = await this.prisma.hierarchyNode.count({
        where: { level: HierarchyLevel.Prant },
      });
      if (existing > 0) {
        throw new BadRequestException(
          `A Prant (root) node already exists. Only one root is allowed.`,
        );
      }
    } else {
      if (!dto.parentId) {
        throw new BadRequestException(
          `Level '${dto.level}' requires a parent. Expected parent level: '${requiredParentLevel}'`,
        );
      }

      const parent = await this.prisma.hierarchyNode.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException(
          `Parent node with id ${dto.parentId} not found`,
        );
      }

      if (parent.level !== requiredParentLevel) {
        throw new BadRequestException(
          `Invalid parent for level '${dto.level}'. Expected: '${requiredParentLevel}', got: '${parent.level}'`,
        );
      }
    }

    const duplicate = await this.prisma.hierarchyNode.count({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        parentId: dto.parentId ?? null,
      },
    });

    if (duplicate > 0) {
      throw new BadRequestException(
        `A node with name '${dto.name}' already exists under the same parent`,
      );
    }

    try {
      return await this.prisma.hierarchyNode.create({
        data: {
          name: dto.name,
          level: dto.level,
          parentId: dto.parentId ?? null,
          description: dto.description ?? '',
        },
      });
    } catch (err) {
      throw err;
    }
  }

  async update(id: number, dto: UpdateHierarchyNodeDto) {
    const node = await this.findOne(id);

    if (dto.name && dto.name !== node.name) {
      const duplicate = await this.prisma.hierarchyNode.count({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          parentId: node.parentId ?? null,
          NOT: { id },
        },
      });

      if (duplicate > 0) {
        throw new BadRequestException(
          `A node with name '${dto.name}' already exists under the same parent`,
        );
      }
    }

    try {
      return await this.prisma.hierarchyNode.update({
        where: { id },
        data: dto,
      });
    } catch (err) {
      throw err;
    }
  }

  async setStatus(id: number, status: HierarchyStatus) {
    await this.findOne(id);

    return await this.prisma.hierarchyNode.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: number) {
    const node = await this.findOne(id);

    // 1. Strict Leaf Node Check: Cannot delete if it has child nodes
    const childCount = await this.prisma.hierarchyNode.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      throw new BadRequestException(
        `Cannot delete '${node.name}'. It has ${childCount} child node(s). Only leaf nodes without children can be deleted. Please delete all child nodes first.`,
      );
    }

    // 2. Active User / Designation Assignment Check
    const activeAssignments = await this.prisma.userHierarchyDesignation.count({
      where: { nodeId: id, isActive: true },
    });

    if (activeAssignments > 0) {
      throw new BadRequestException(
        `Cannot delete '${node.name}' because ${activeAssignments} user(s) are currently assigned to this point. Please unassign all users first.`,
      );
    }

    // 3. Dispatch Reference Check
    const dispatchCount = await this.prisma.dispatchEntry.count({
      where: {
        OR: [{ fromPointId: id }, { toPointId: id }],
      },
    });

    if (dispatchCount > 0) {
      throw new BadRequestException(
        `Cannot delete '${node.name}' because it has ${dispatchCount} dispatch record(s) associated with it.`,
      );
    }

    try {
      return await this.prisma.hierarchyNode.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          `Cannot delete node '${node.name}' due to existing references.`,
        );
      }
      throw err;
    }
  }

  async getReportingCandidates(id: number) {
    const node = await this.findOne(id);

    // 1. Collect upper hierarchy ancestor IDs (immediate parent up to root)
    const ancestorNodeIds: number[] = [];
    let currentParentId: number | null = node.parentId;
    while (currentParentId !== null) {
      ancestorNodeIds.push(currentParentId);
      const parentNode: { parentId: number | null } | null =
        await this.prisma.hierarchyNode.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
      currentParentId = parentNode?.parentId ?? null;
    }

    // 2. Fetch active officers from upper nodes and current point
    const eligibleNodeIds = [node.id, ...ancestorNodeIds];

    const activeAssignments =
      await this.prisma.userHierarchyDesignation.findMany({
        where: {
          nodeId: { in: eligibleNodeIds },
          isActive: true,
          user: { status: UserStatus.Active },
        },
        include: {
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              email: true,
              mobile: true,
              profileImage: true,
            },
          },
          node: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          designation: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
        orderBy: [{ assignedAt: 'asc' }],
      });

    // 3. Map candidates with designation and node details
    const candidates = activeAssignments.map((a) => ({
      userId: a.user.id,
      name: `${a.user.firstname} ${a.user.lastname}`.trim(),
      email: a.user.email,
      mobile: a.user.mobile,
      nodeId: a.user.id,
      designationId: a.designation.id,
      designationName: a.designation.name,
      isImmediateParent: node.parentId !== null && a.node.id === node.parentId,
    }));

    // 4. Auto-select preferred reporting authority (immediate parent head first)
    let preferred = candidates.find((c) => c.isImmediateParent);
    if (!preferred && ancestorNodeIds.length > 0) {
      for (const ancestorId of ancestorNodeIds) {
        preferred = candidates.find((c) => c.nodeId === ancestorId);
        if (preferred) break;
      }
    }
    if (!preferred && candidates.length > 0) {
      preferred = candidates[0];
    }

    return {
      nodeId: node.id,
      nodeName: node.name,
      nodeLevel: node.level,
      parentId: node.parentId,
      preferredReportingAuthority: preferred ?? null,
      allReportingAuthorities: candidates,
    };
  }
}
