import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import {
  HierarchyLevel,
  HierarchyStatus,
  Prisma,
} from '../generated/prisma/client';
import {
  CreateHierarchyNodeDto,
  GetHierarchyNodesDto,
  UpdateHierarchyNodeDto,
} from './dto';

// ── Level order & parent rules ────────────────────────────────────────────────

const LEVEL_ORDER: HierarchyLevel[] = [
  HierarchyLevel.Sangh,
  HierarchyLevel.Jila,
  HierarchyLevel.KhandNagar,
  HierarchyLevel.MandalBasti,
  HierarchyLevel.GramMohalla,
];

/** Maps each level to its required parent level */
const REQUIRED_PARENT_LEVEL: Partial<Record<HierarchyLevel, HierarchyLevel>> = {
  [HierarchyLevel.Jila]: HierarchyLevel.Sangh,
  [HierarchyLevel.KhandNagar]: HierarchyLevel.Jila,
  [HierarchyLevel.MandalBasti]: HierarchyLevel.KhandNagar,
  [HierarchyLevel.GramMohalla]: HierarchyLevel.MandalBasti,
};

// ── Type helpers ──────────────────────────────────────────────────────────────

type NodeWithChildren = Prisma.HierarchyNodeGetPayload<{
  include: { children: true };
}>;

@Injectable()
export class HierarchyService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async findNodeOrThrow(id: number) {
    const node = await this.prisma.hierarchyNode.findUnique({
      where: { id },
      include: { children: true },
    });
    if (!node)
      throw new NotFoundException(`Hierarchy node with ID ${id} not found`);
    return node;
  }

  /**
   * Validates parent-type constraints:
   * - Sangh has no parent
   * - Every other level must have a parent whose level is exactly one above
   */
  private async validateParentConstraint(
    level: HierarchyLevel,
    parentId?: number,
  ): Promise<void> {
    const requiredParentLevel = REQUIRED_PARENT_LEVEL[level];

    if (!requiredParentLevel) {
      // Sangh (root) — must have no parent
      if (parentId !== undefined && parentId !== null) {
        throw new BadRequestException(
          `Sangh is the root level and cannot have a parent node`,
        );
      }
      // Ensure only one Sangh root exists
      const existing = await this.prisma.hierarchyNode.count({
        where: { level: HierarchyLevel.Sangh },
      });
      if (existing > 0) {
        throw new BadRequestException(
          `A Sangh (root) node already exists. Only one root is allowed.`,
        );
      }
      return;
    }

    // Non-root levels must supply a parentId
    if (parentId === undefined || parentId === null) {
      throw new BadRequestException(
        `Level '${level}' requires a parent node. Expected parent level: '${requiredParentLevel}'`,
      );
    }

    const parent = await this.prisma.hierarchyNode.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new NotFoundException(`Parent node with ID ${parentId} not found`);
    }
    if (parent.level !== requiredParentLevel) {
      throw new BadRequestException(
        `Invalid parent for level '${level}'. Expected parent level: '${requiredParentLevel}', but got: '${parent.level}'`,
      );
    }
  }

  private toResponse(node: NodeWithChildren) {
    return {
      id: node.id,
      name: node.name,
      level: node.level,
      levelOrder: LEVEL_ORDER.indexOf(node.level),
      status: node.status,
      description: node.description,
      parentId: node.parentId,
      childrenCount: node.children.length,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }

  private buildTree(
    nodes: NodeWithChildren[],
    parentId: number | null = null,
  ): any[] {
    return nodes
      .filter((n) => (n.parentId ?? null) === parentId)
      .map((n) => ({
        id: n.id,
        name: n.name,
        level: n.level,
        levelOrder: LEVEL_ORDER.indexOf(n.level),
        status: n.status,
        description: n.description,
        parentId: n.parentId,
        children: this.buildTree(nodes, n.id),
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      }));
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Returns all nodes as a nested tree rooted at Sangh */
  async getTree() {
    const nodes = await this.prisma.hierarchyNode.findMany({
      include: { children: true },
      orderBy: { id: 'asc' },
    });
    const tree = this.buildTree(nodes as NodeWithChildren[]);
    return { tree };
  }

  /** Flat paginated list with optional filters */
  async listNodes(query: GetHierarchyNodesDto) {
    const search = query.search?.trim();
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const where: Prisma.HierarchyNodeWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (query.level) where.level = query.level;
    if (query.status) where.status = query.status;
    if (query.parentId !== undefined) {
      where.parentId = Number(query.parentId) || null;
    }

    const [nodes, total] = await Promise.all([
      this.prisma.hierarchyNode.findMany({
        where,
        include: { children: true },
        orderBy: [{ level: 'asc' }, { id: 'asc' }],
        skip,
        take,
      }),
      this.prisma.hierarchyNode.count({ where }),
    ]);

    return {
      result: nodes.map((n) => this.toResponse(n as NodeWithChildren)),
      total,
      skip,
      take,
    };
  }

  /** Single node by ID (flat, with children count) */
  async getNode(id: number) {
    return this.toResponse(await this.findNodeOrThrow(id));
  }

  /** Get all direct children of a node */
  async getChildren(id: number) {
    await this.findNodeOrThrow(id);

    const children = await this.prisma.hierarchyNode.findMany({
      where: { parentId: id },
      include: { children: true },
      orderBy: { id: 'asc' },
    });

    return {
      result: children.map((n) => this.toResponse(n as NodeWithChildren)),
      total: children.length,
    };
  }

  /** Create a new node with strict level/parent validation */
  async createNode(dto: CreateHierarchyNodeDto) {
    await this.validateParentConstraint(dto.level, dto.parentId);

    // Name must be unique within the same parent scope
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

    const node = await this.prisma.hierarchyNode.create({
      data: {
        name: dto.name,
        level: dto.level,
        parentId: dto.parentId ?? null,
        description: dto.description ?? '',
      },
      include: { children: true },
    });

    return this.toResponse(node as NodeWithChildren);
  }

  /** Update name and/or description — level and parent are immutable */
  async updateNode(id: number, dto: UpdateHierarchyNodeDto) {
    const node = await this.findNodeOrThrow(id);

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

    const updated = await this.prisma.hierarchyNode.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { children: true },
    });

    return this.toResponse(updated as NodeWithChildren);
  }

  /** Toggle Active / InActive status */
  async setStatus(id: number, status: HierarchyStatus) {
    await this.findNodeOrThrow(id);

    const updated = await this.prisma.hierarchyNode.update({
      where: { id },
      data: { status },
      include: { children: true },
    });

    return this.toResponse(updated as NodeWithChildren);
  }

  /**
   * Delete a leaf node only (cannot delete if it has children).
   * Prevents orphaning the subtree.
   */
  async deleteNode(id: number) {
    const node = await this.findNodeOrThrow(id);

    if (node.children.length > 0) {
      throw new BadRequestException(
        `Cannot delete node '${node.name}' — it has ${node.children.length} child node(s). Remove all children first.`,
      );
    }

    await this.prisma.hierarchyNode.delete({ where: { id } });

    return { message: `Node '${node.name}' deleted successfully` };
  }
}
