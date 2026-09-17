import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  HierarchyLevel,
  HierarchyStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHierarchyNodeDto } from './dto/create-hierarchy-node.dto';
import { UpdateHierarchyNodeDto } from './dto/update-hierarchy-node.dto';
import { GetHierarchyNodesDto } from './dto/get-hierarchy-nodes.dto';

const LEVEL_ORDER: HierarchyLevel[] = [
  HierarchyLevel.Prant,
  HierarchyLevel.Jila,
  HierarchyLevel.KhandNagar,
  HierarchyLevel.MandalBasti,
  HierarchyLevel.GramMohalla,
];

/** Each level's required parent level — Prant has no entry (root) */
const REQUIRED_PARENT_LEVEL: Partial<Record<HierarchyLevel, HierarchyLevel>> = {
  [HierarchyLevel.Jila]: HierarchyLevel.Prant,
  [HierarchyLevel.KhandNagar]: HierarchyLevel.Jila,
  [HierarchyLevel.MandalBasti]: HierarchyLevel.KhandNagar,
  [HierarchyLevel.GramMohalla]: HierarchyLevel.MandalBasti,
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
    await this.findOne(id);

    try {
      return await this.prisma.hierarchyNode.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2003'
      ) {
        throw new BadRequestException(
          `This node cannot be deleted because it has child nodes. Remove all children first.`,
        );
      }
      throw err;
    }
  }
}
