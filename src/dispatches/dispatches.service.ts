import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser, UserType } from '@Common';
import { PrismaService } from '../prisma';
import {
  DispatchEntry,
  DispatchStatus,
  HierarchyLevel,
  HierarchyStatus,
  Prisma,
  PublishIssueStatus,
} from '../generated/prisma/client';
import {
  CreateDispatchEntryRequestDto,
  ForwardDispatchRequestDto,
  GetDispatchesRequestDto,
  InTransitDispatchRequestDto,
  ReceiveDispatchRequestDto,
  UpdateDispatchEntryRequestDto,
} from './dto';

const DISPATCH_INCLUDE = {
  issue: {
    select: {
      id: true,
      issueNo: true,
      title: true,
      publishDate: true,
      totalCopies: true,
      status: true,
    },
  },
  fromPoint: {
    select: {
      id: true,
      name: true,
      level: true,
      parentId: true,
      status: true,
    },
  },
  toPoint: {
    select: {
      id: true,
      name: true,
      level: true,
      parentId: true,
      status: true,
    },
  },
  receivedBy: {
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      username: true,
    },
  },
  dispatchedBy: {
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      username: true,
    },
  },
} as const;

const HIERARCHY_LEVEL_RANK: Record<HierarchyLevel, number> = {
  [HierarchyLevel.Prant]: 1,
  [HierarchyLevel.Jila]: 2,
  [HierarchyLevel.Khand]: 3,
  [HierarchyLevel.Mandal]: 4,
  [HierarchyLevel.Gram]: 5,
};

const ALLOWED_DOWNSTREAM_LEVEL: Partial<
  Record<HierarchyLevel, HierarchyLevel>
> = {
  [HierarchyLevel.Prant]: HierarchyLevel.Jila,
  [HierarchyLevel.Jila]: HierarchyLevel.Khand,
  [HierarchyLevel.Khand]: HierarchyLevel.Mandal,
  [HierarchyLevel.Mandal]: HierarchyLevel.Gram,
};

@Injectable()
export class DispatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: number) {
    const dispatch = await this.prisma.dispatchEntry.findUnique({
      where: { id },
      include: DISPATCH_INCLUDE,
    });

    if (!dispatch) {
      throw new NotFoundException(`Dispatch entry with ID ${id} not found`);
    }

    return dispatch;
  }

  async findAll(query: GetDispatchesRequestDto) {
    const where: Prisma.DispatchEntryWhereInput = {};

    if (query.issueId) {
      where.issueId = query.issueId;
    }

    if (query.fromPointId) {
      where.fromPointId = query.fromPointId;
    }

    if (query.toPointId) {
      where.toPointId = query.toPointId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { trackingLink: { contains: search, mode: 'insensitive' } },
        { issue: { issueNo: { contains: search, mode: 'insensitive' } } },
        { issue: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.dispatchDate = {
        ...(query.startDate && { gte: query.startDate }),
        ...(query.endDate && { lte: query.endDate }),
      };
    }

    const count = await this.prisma.dispatchEntry.count({ where });

    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const data = await this.prisma.dispatchEntry.findMany({
      where,
      skip,
      take,
      orderBy: [{ dispatchDate: 'desc' }, { id: 'desc' }],
      include: DISPATCH_INCLUDE,
    });

    return { count, skip, take, data };
  }

  async getChainOfCustody(issueId: number) {
    const issue = await this.prisma.publishIssue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw new NotFoundException(`Publish issue with ID ${issueId} not found`);
    }

    const dispatches = await this.prisma.dispatchEntry.findMany({
      where: { issueId },
      orderBy: [{ dispatchDate: 'asc' }, { id: 'asc' }],
      include: DISPATCH_INCLUDE,
    });

    return {
      issue: {
        id: issue.id,
        issueNo: issue.issueNo,
        title: issue.title,
        publishDate: issue.publishDate,
        totalCopies: issue.totalCopies,
        status: issue.status,
      },
      chainLength: dispatches.length,
      chain: dispatches,
    };
  }

  async create(dto: CreateDispatchEntryRequestDto, userId?: number) {
    if (dto.quantity <= 0) {
      throw new BadRequestException(
        'quantity must be a positive integer greater than 0',
      );
    }

    // 1. Issue Validation
    const issue = await this.prisma.publishIssue.findUnique({
      where: { id: dto.issueId },
    });

    if (!issue) {
      throw new NotFoundException(
        `Publish issue with ID ${dto.issueId} not found`,
      );
    }

    if (issue.status !== PublishIssueStatus.Published) {
      throw new BadRequestException(
        `Cannot dispatch issue '${issue.issueNo}' in '${issue.status}' status. Only Published issues can be dispatched.`,
      );
    }

    // 2. Destination Validation
    const toPoint = await this.prisma.hierarchyNode.findUnique({
      where: { id: dto.toPointId },
    });

    if (!toPoint) {
      throw new NotFoundException(
        `Destination hierarchy point with ID ${dto.toPointId} not found`,
      );
    }

    // 3. Hierarchy & Source Validation
    if (!dto.fromPointId) {
      // Central Publisher dispatch: can dispatch downstream to root Prant node
      if (toPoint.level !== HierarchyLevel.Prant) {
        throw new BadRequestException(
          `Central publisher can only dispatch to root '${HierarchyLevel.Prant}' level. Destination '${toPoint.name}' is '${toPoint.level}'.`,
        );
      }

      // Check central copies availability
      const activeCentralDispatches = await this.prisma.dispatchEntry.findMany({
        where: {
          issueId: dto.issueId,
          fromPointId: null,
          status: { not: DispatchStatus.Cancelled },
        },
      });

      const alreadyDispatched = activeCentralDispatches.reduce(
        (sum, d) => sum + d.quantity,
        0,
      );
      const availableCentral = issue.totalCopies - alreadyDispatched;

      if (dto.quantity > availableCentral) {
        throw new BadRequestException(
          `Requested quantity (${dto.quantity}) exceeds available central copies (${availableCentral}). Total published copies: ${issue.totalCopies}, already dispatched: ${alreadyDispatched}.`,
        );
      }
    } else {
      if (dto.fromPointId === dto.toPointId) {
        throw new BadRequestException(
          'Source and destination hierarchy points cannot be the same',
        );
      }

      const fromPoint = await this.prisma.hierarchyNode.findUnique({
        where: { id: dto.fromPointId },
      });

      if (!fromPoint) {
        throw new NotFoundException(
          `Source hierarchy point with ID ${dto.fromPointId} not found`,
        );
      }

      if (fromPoint.level === HierarchyLevel.Gram) {
        throw new BadRequestException(
          `Level '${fromPoint.level}' is a terminal leaf node and cannot dispatch copies further downstream`,
        );
      }

      // Downstream direction validation
      if (
        HIERARCHY_LEVEL_RANK[toPoint.level] <=
        HIERARCHY_LEVEL_RANK[fromPoint.level]
      ) {
        throw new BadRequestException(
          `Invalid hierarchy direction: Dispatches can only move downstream to lower levels ('${fromPoint.level}' cannot dispatch to '${toPoint.level}').`,
        );
      }

      // Flexible Branch / Ancestry Validation (allows direct downstream branch jumps)
      if (toPoint.parentId !== fromPoint.id) {
        const isDescendant = await this.isDescendantOf(
          toPoint.id,
          fromPoint.id,
        );
        if (!isDescendant) {
          throw new BadRequestException(
            `Destination point '${toPoint.name}' is not within the geographic branch of source point '${fromPoint.name}'`,
          );
        }
      }

      // 4. Upstream Receipt Rule Validation
      // 4. Upstream Receipt Rule Validation
      // Allow top-level Prant (root) nodes to originate downstream dispatches
      // without requiring a prior upstream receipt. This treats a root node
      // as an origin for its branch in the hierarchy.
      if (
        !(
          fromPoint.level === HierarchyLevel.Prant &&
          fromPoint.parentId === null
        )
      ) {
        await this.validateUpstreamReceiptAndStock(
          dto.issueId,
          fromPoint.id,
          fromPoint.name,
          dto.quantity,
          issue.issueNo,
        );
      }
    }

    // 5. Prevent Duplicate Active Dispatch
    const activeDuplicate = await this.prisma.dispatchEntry.findFirst({
      where: {
        issueId: dto.issueId,
        fromPointId: dto.fromPointId ?? null,
        toPointId: dto.toPointId,
        status: { in: [DispatchStatus.Dispatched, DispatchStatus.InTransit] },
      },
    });

    if (activeDuplicate) {
      throw new BadRequestException(
        `An active dispatch (#${activeDuplicate.id} - ${activeDuplicate.status}) for this issue to the same destination already exists`,
      );
    }

    // 6. Create Dispatch
    return await this.prisma.dispatchEntry.create({
      data: {
        issueId: dto.issueId,
        fromPointId: dto.fromPointId ?? null,
        toPointId: dto.toPointId,
        quantity: dto.quantity,
        dispatchDate: dto.dispatchDate ?? new Date(),
        trackingLink: dto.trackingLink ?? null,
        status: DispatchStatus.Dispatched,
        dispatchedById: userId ?? null,
      },
      include: DISPATCH_INCLUDE,
    });
  }

  async setInTransit(id: number, dto?: InTransitDispatchRequestDto) {
    const dispatch = await this.findOne(id);

    if (dispatch.status !== DispatchStatus.Dispatched) {
      throw new BadRequestException(
        `Cannot move dispatch to InTransit from '${dispatch.status}'. Only Dispatched records can move to InTransit.`,
      );
    }

    return await this.prisma.dispatchEntry.update({
      where: { id },
      data: {
        status: DispatchStatus.InTransit,
        ...(dto?.trackingLink !== undefined && {
          trackingLink: dto.trackingLink,
        }),
      },
      include: DISPATCH_INCLUDE,
    });
  }

  async receive(id: number, dto: ReceiveDispatchRequestDto, userId: number) {
    const dispatch = await this.findOne(id);

    if (
      dispatch.status !== DispatchStatus.InTransit &&
      dispatch.status !== DispatchStatus.Dispatched
    ) {
      throw new BadRequestException(
        `Cannot receive dispatch in '${dispatch.status}' status. Only Dispatched or InTransit consignments can be received.`,
      );
    }

    if (dto.receivedQuantity < 0) {
      throw new BadRequestException('receivedQuantity cannot be negative');
    }

    if (dto.receivedQuantity > dispatch.quantity) {
      throw new BadRequestException(
        `receivedQuantity (${dto.receivedQuantity}) cannot be greater than dispatched quantity (${dispatch.quantity})`,
      );
    }

    const nextStatus =
      dto.receivedQuantity === dispatch.quantity
        ? DispatchStatus.Received
        : DispatchStatus.Discrepancy;

    return await this.prisma.dispatchEntry.update({
      where: { id },
      data: {
        receivedQuantity: dto.receivedQuantity,
        receivedAt: new Date(),
        receivedById: userId,
        status: nextStatus,
      },
      include: DISPATCH_INCLUDE,
    });
  }

  async forward(id: number, dto: ForwardDispatchRequestDto, userId?: number) {
    if (dto.quantity <= 0) {
      throw new BadRequestException(
        'quantity must be a positive integer greater than 0',
      );
    }

    const sourceDispatch = await this.findOne(id);

    if (
      sourceDispatch.status !== DispatchStatus.Received &&
      sourceDispatch.status !== DispatchStatus.Discrepancy &&
      sourceDispatch.status !== DispatchStatus.Forwarded
    ) {
      throw new BadRequestException(
        `Cannot forward dispatch in '${sourceDispatch.status}' status. Dispatch must be Received or Discrepancy before forwarding.`,
      );
    }

    const sourcePointId = sourceDispatch.toPointId;
    const sourcePoint = sourceDispatch.toPoint;

    if (sourcePointId === dto.toPointId) {
      throw new BadRequestException(
        'Forward destination cannot be the same as the receiving point',
      );
    }

    const toPoint = await this.prisma.hierarchyNode.findUnique({
      where: { id: dto.toPointId },
    });

    if (!toPoint) {
      throw new NotFoundException(
        `Destination hierarchy point with ID ${dto.toPointId} not found`,
      );
    }

    if (sourcePoint.level === HierarchyLevel.Gram) {
      throw new BadRequestException(
        `Level '${sourcePoint.level}' is a terminal leaf node and cannot forward copies further downstream`,
      );
    }

    // Downstream direction validation
    if (
      HIERARCHY_LEVEL_RANK[toPoint.level] <=
      HIERARCHY_LEVEL_RANK[sourcePoint.level]
    ) {
      throw new BadRequestException(
        `Invalid hierarchy direction: Dispatches can only be forwarded downstream to lower levels ('${sourcePoint.level}' cannot forward to '${toPoint.level}').`,
      );
    }

    // Flexible Branch / Ancestry Validation (allows direct downstream branch jumps)
    if (toPoint.parentId !== sourcePoint.id) {
      const isDescendant = await this.isDescendantOf(
        toPoint.id,
        sourcePoint.id,
      );
      if (!isDescendant) {
        throw new BadRequestException(
          `Destination '${toPoint.name}' is not within the geographic branch of source point '${sourcePoint.name}'`,
        );
      }
    }

    // Verify quantity availability at sourcePoint
    await this.validateUpstreamReceiptAndStock(
      sourceDispatch.issueId,
      sourcePoint.id,
      sourcePoint.name,
      dto.quantity,
      sourceDispatch.issue.issueNo,
    );

    // Prevent duplicate active forward
    const activeDuplicate = await this.prisma.dispatchEntry.findFirst({
      where: {
        issueId: sourceDispatch.issueId,
        fromPointId: sourcePoint.id,
        toPointId: dto.toPointId,
        status: { in: [DispatchStatus.Dispatched, DispatchStatus.InTransit] },
      },
    });

    if (activeDuplicate) {
      throw new BadRequestException(
        `An active dispatch (#${activeDuplicate.id} - ${activeDuplicate.status}) for this issue to '${toPoint.name}' already exists`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create the new downstream dispatch entry
      const newDispatch = await tx.dispatchEntry.create({
        data: {
          issueId: sourceDispatch.issueId,
          fromPointId: sourcePoint.id,
          toPointId: dto.toPointId,
          quantity: dto.quantity,
          dispatchDate: dto.dispatchDate ?? new Date(),
          trackingLink: dto.trackingLink ?? null,
          status: DispatchStatus.Dispatched,
          dispatchedById: userId ?? null,
        },
        include: DISPATCH_INCLUDE,
      });

      // 2. Mark source dispatch as Forwarded
      if (sourceDispatch.status !== DispatchStatus.Forwarded) {
        await tx.dispatchEntry.update({
          where: { id: sourceDispatch.id },
          data: { status: DispatchStatus.Forwarded },
        });
      }

      return newDispatch;
    });
  }

  async cancel(id: number) {
    const dispatch = await this.findOne(id);

    if (
      dispatch.status === DispatchStatus.Received ||
      dispatch.status === DispatchStatus.Discrepancy ||
      dispatch.status === DispatchStatus.Forwarded ||
      dispatch.status === DispatchStatus.Completed
    ) {
      throw new BadRequestException(
        `Cannot cancel dispatch in '${dispatch.status}' status. Chain-of-custody records cannot be cancelled once received or processed.`,
      );
    }

    if (dispatch.status === DispatchStatus.Cancelled) {
      throw new BadRequestException('Dispatch is already cancelled');
    }

    return await this.prisma.dispatchEntry.update({
      where: { id },
      data: { status: DispatchStatus.Cancelled },
      include: DISPATCH_INCLUDE,
    });
  }

  async complete(id: number) {
    const dispatch = await this.findOne(id);

    if (dispatch.status === DispatchStatus.Completed) {
      throw new BadRequestException('Dispatch is already completed');
    }

    if (dispatch.status === DispatchStatus.Cancelled) {
      throw new BadRequestException('Cannot complete a cancelled dispatch');
    }

    // A dispatch can only complete if it has fulfilled its downstream lifecycle:
    // Either it was Forwarded, or it is at the terminal Gram level and was Received/Discrepancy
    const isLeafReceived =
      dispatch.toPoint.level === HierarchyLevel.Gram &&
      (dispatch.status === DispatchStatus.Received ||
        dispatch.status === DispatchStatus.Discrepancy);

    if (dispatch.status !== DispatchStatus.Forwarded && !isLeafReceived) {
      throw new BadRequestException(
        `Cannot mark dispatch as Completed in '${dispatch.status}' status. Completed represents completion of that dispatch's downstream distribution.`,
      );
    }

    return await this.prisma.dispatchEntry.update({
      where: { id },
      data: { status: DispatchStatus.Completed },
      include: DISPATCH_INCLUDE,
    });
  }

  async update(id: number, dto: UpdateDispatchEntryRequestDto) {
    const dispatch = await this.findOne(id);

    if (
      dispatch.status === DispatchStatus.Received ||
      dispatch.status === DispatchStatus.Discrepancy ||
      dispatch.status === DispatchStatus.Forwarded ||
      dispatch.status === DispatchStatus.Completed ||
      dispatch.status === DispatchStatus.Cancelled
    ) {
      throw new BadRequestException(
        `Cannot modify details for a dispatch in '${dispatch.status}' status. Historical facts cannot be altered.`,
      );
    }

    const data: Prisma.DispatchEntryUpdateInput = {
      ...(dto.dispatchDate !== undefined && { dispatchDate: dto.dispatchDate }),
      ...(dto.trackingLink !== undefined && { trackingLink: dto.trackingLink }),
    };

    return await this.prisma.dispatchEntry.update({
      where: { id },
      data,
      include: DISPATCH_INCLUDE,
    });
  }

  private async validateUpstreamReceiptAndStock(
    issueId: number,
    nodeId: number,
    nodeName: string,
    requestedQuantity: number,
    issueNo: string,
  ): Promise<void> {
    const upstreamConsignments = await this.prisma.dispatchEntry.findMany({
      where: {
        issueId,
        toPointId: nodeId,
      },
    });

    if (upstreamConsignments.length === 0) {
      throw new BadRequestException(
        `Node '${nodeName}' has not received any upstream dispatch for issue #${issueNo}`,
      );
    }

    const receivedConsignments = upstreamConsignments.filter(
      (d) =>
        d.status === DispatchStatus.Received ||
        d.status === DispatchStatus.Discrepancy ||
        d.status === DispatchStatus.Forwarded ||
        d.status === DispatchStatus.Completed,
    );

    if (receivedConsignments.length === 0) {
      throw new BadRequestException(
        `Cannot create downstream dispatch. Upstream dispatch to '${nodeName}' is in '${upstreamConsignments[0].status}' status and has not been received yet.`,
      );
    }

    const totalReceivedAtNode = receivedConsignments.reduce(
      (sum, d) => sum + (d.receivedQuantity ?? 0),
      0,
    );

    const downstreamDispatches = await this.prisma.dispatchEntry.findMany({
      where: {
        issueId,
        fromPointId: nodeId,
        status: { not: DispatchStatus.Cancelled },
      },
    });

    const totalDispatchedDownstream = downstreamDispatches.reduce(
      (sum, d) => sum + d.quantity,
      0,
    );

    const availableQuantity = totalReceivedAtNode - totalDispatchedDownstream;

    if (requestedQuantity > availableQuantity) {
      throw new BadRequestException(
        `Requested quantity (${requestedQuantity}) exceeds available received copies (${availableQuantity}) at '${nodeName}'. Total received: ${totalReceivedAtNode}, already dispatched: ${totalDispatchedDownstream}.`,
      );
    }
  }

  // Check if a node is within the downstream branch of an ancestor
  private async isDescendantOf(
    childNodeId: number,
    targetAncestorId: number,
  ): Promise<boolean> {
    let currentId: number | null = childNodeId;
    while (currentId !== null) {
      const parentRecord: { parentId: number | null } | null =
        await this.prisma.hierarchyNode.findUnique({
          where: { id: currentId },
          select: { parentId: true },
        });
      if (!parentRecord || parentRecord.parentId === null) {
        return false;
      }
      if (parentRecord.parentId === targetAncestorId) {
        return true;
      }
      currentId = parentRecord.parentId;
    }
    return false;
  }

  // Get active source point and valid destination dropdown for current user
  async getMyDispatchContext(user: AuthenticatedUser) {
    if (user.type === UserType.Admin) {
      const rootNodes = await this.prisma.hierarchyNode.findMany({
        where: { level: HierarchyLevel.Prant, status: HierarchyStatus.Active },
        select: { id: true, name: true, level: true },
        orderBy: { name: 'asc' },
      });

      return {
        isSuperAdmin: true,
        hasActiveAssignment: true,
        sourcePoint: null, // Central publisher
        designation: { id: 0, name: 'Super Administrator', level: 'Central' },
        allowedDestinations: rootNodes,
      };
    }

    const activeAssignment =
      await this.prisma.userHierarchyDesignation.findFirst({
        where: { userId: user.id, isActive: true },
        include: {
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
            select: { id: true, name: true, level: true },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });

    if (!activeAssignment) {
      return {
        isSuperAdmin: false,
        hasActiveAssignment: false,
        message: 'No active hierarchy assignment found for current user',
        sourcePoint: null,
        designation: null,
        allowedDestinations: [],
      };
    }

    const sourcePoint = activeAssignment.node;

    if (sourcePoint.level === HierarchyLevel.Gram) {
      return {
        isSuperAdmin: false,
        hasActiveAssignment: true,
        sourcePoint: {
          id: sourcePoint.id,
          name: sourcePoint.name,
          level: sourcePoint.level,
        },
        designation: activeAssignment.designation,
        allowedDestinations: [],
      };
    }

    const allNodes = await this.prisma.hierarchyNode.findMany({
      where: { status: HierarchyStatus.Active },
      select: { id: true, name: true, level: true, parentId: true },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });

    const allowedDestinations = this.collectDescendants(
      sourcePoint.id,
      allNodes,
    );

    return {
      isSuperAdmin: false,
      hasActiveAssignment: true,
      sourcePoint: {
        id: sourcePoint.id,
        name: sourcePoint.name,
        level: sourcePoint.level,
      },
      designation: activeAssignment.designation,
      allowedDestinations,
    };
  }

  private collectDescendants(
    parentId: number,
    allNodes: Array<{
      id: number;
      name: string;
      level: HierarchyLevel;
      parentId: number | null;
    }>,
  ): Array<{ id: number; name: string; level: HierarchyLevel }> {
    const directChildren = allNodes.filter((n) => n.parentId === parentId);
    let descendants: Array<{
      id: number;
      name: string;
      level: HierarchyLevel;
    }> = [
      ...directChildren.map((n) => ({
        id: n.id,
        name: n.name,
        level: n.level,
      })),
    ];
    for (const child of directChildren) {
      descendants = descendants.concat(
        this.collectDescendants(child.id, allNodes),
      );
    }
    return descendants;
  }
}
