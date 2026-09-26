import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@Common';
import { PrismaService } from '../prisma';
import {
  DeliveryLogStatus,
  DispatchStatus,
  Prisma,
  UserStatus,
} from '../generated/prisma/client';
import { GetDeliveryLogsRequestDto, MarkDeliveryLogRequestDto } from './dto';

const DELIVERY_LOG_INCLUDE = {
  user: {
    select: {
      id: true,
      fullName: true,
      whatsappMobile: true,
      fullAddress: true,
    },
  },
  deliveredBy: {
    select: {
      id: true,
      firstname: true,
      lastname: true,
    },
  },
} as const;

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async generateForDispatch(params: {
    dispatchEntryId: number;
    issueId: number;
    gramNodeId: number;
  }): Promise<void> {
    const existingCount = await this.prisma.deliveryLog.count({
      where: {
        dispatchEntryId: params.dispatchEntryId,
      },
    });

    if (existingCount > 0) {
      return;
    }

    const eligibleUsers = await this.prisma.user.findMany({
      where: {
        gramId: params.gramNodeId,
        status: UserStatus.Active,
        subscriptions: {
          some: {
            isActive: true,
          },
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (eligibleUsers.length === 0) {
      return;
    }

    await this.prisma.deliveryLog.createMany({
      data: eligibleUsers.map((user) => ({
        dispatchEntryId: params.dispatchEntryId,
        issueId: params.issueId,
        userId: user.id,
        status: DeliveryLogStatus.Pending,
      })),
    });
  }

  async findAll(query: GetDeliveryLogsRequestDto) {
    const where: Prisma.DeliveryLogWhereInput = {
      ...(query.dispatchEntryId && {
        dispatchEntryId: query.dispatchEntryId,
      }),

      ...(query.issueId && {
        issueId: query.issueId,
      }),

      ...(query.status && {
        status: query.status,
      }),

      ...(query.gramId && {
        dispatchEntry: {
          toPointId: query.gramId,
        },
      }),
    };

    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const [count, logs] = await Promise.all([
      this.prisma.deliveryLog.count({ where }),

      this.prisma.deliveryLog.findMany({
        where,
        skip,
        take,
        orderBy: {
          id: 'asc',
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              whatsappMobile: true,
              fullAddress: true,
            },
          },

          dispatchEntry: {
            select: {
              id: true,
            },
          },

          issue: {
            select: {
              id: true,
            },
          },

          deliveredBy: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
            },
          },
        },
      }),
    ]);

    return {
      count,
      skip,
      take,

      data: logs.map((log) => ({
        id: log.id,
        consumerId: log.userId,
        dispatchId: log.dispatchEntryId,
        issueId: log.issueId,
        status: log.status,
        deliveryDate: log.deliveredAt,
        remarks: log.remarks,
        deliveryProof: log.proofReference,
        deliveredBy: log.deliveredBy,
      })),
    };
  }

  async findAllForDispatch(dispatchEntryId: number) {
    const logs = await this.prisma.deliveryLog.findMany({
      where: {
        dispatchEntryId,
      },
      include: DELIVERY_LOG_INCLUDE,
      orderBy: {
        id: 'asc',
      },
    });

    const summary = {
      total: logs.length,
      pending: logs.filter((l) => l.status === DeliveryLogStatus.Pending)
        .length,
      delivered: logs.filter((l) => l.status === DeliveryLogStatus.Delivered)
        .length,
      failed: logs.filter((l) => l.status === DeliveryLogStatus.Failed).length,
    };

    return {
      summary,
      logs,
    };
  }

  async markDelivered(
    id: number,
    dto: MarkDeliveryLogRequestDto,
    user: AuthenticatedUser,
  ) {
    if (
      dto.status !== DeliveryLogStatus.Delivered &&
      dto.status !== DeliveryLogStatus.Failed
    ) {
      throw new BadRequestException('status must be Delivered or Failed');
    }

    const log = await this.prisma.deliveryLog.findUnique({
      where: {
        id,
      },
      include: {
        dispatchEntry: {
          select: {
            id: true,
            toPointId: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException(`Delivery log with ID ${id} not found`);
    }

    if (log.status !== DeliveryLogStatus.Pending) {
      throw new BadRequestException(
        `This delivery log is already marked as '${log.status}' and cannot be changed`,
      );
    }

    const assignment = await this.prisma.userHierarchyDesignation.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        nodeId: true,
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    if (!assignment || assignment.nodeId !== log.dispatchEntry.toPointId) {
      throw new ForbiddenException(
        'You are not authorized to record deliveries for this dispatch. It is not addressed to your assigned hierarchy node.',
      );
    }

    if (
      dto.dispatchEntryId !== undefined &&
      dto.dispatchEntryId !== log.dispatchEntryId
    ) {
      throw new BadRequestException(
        'Consumer does not belong to the specified dispatch',
      );
    }

    if (dto.issueId !== undefined && dto.issueId !== log.issueId) {
      throw new BadRequestException(
        'Consumer does not belong to the specified Patrika issue',
      );
    }

    if (!dto.deliveryDate) {
      throw new BadRequestException('deliveryDate is required');
    }

    const deliveryDate = new Date(dto.deliveryDate);

    if (Number.isNaN(deliveryDate.getTime())) {
      throw new BadRequestException('Invalid deliveryDate');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const deliveryLog = await tx.deliveryLog.update({
        where: {
          id,
        },
        data: {
          status: dto.status,
          remarks: dto.remarks ?? '',
          deliveredAt: new Date(dto.deliveryDate),
          deliveredById: user.id,
          proofReference: dto.deliveryProof ?? null,
        },
        include: DELIVERY_LOG_INCLUDE,
      });

      return deliveryLog;
    });

    await this.autoCompleteIfResolved(log.dispatchEntryId);

    return {
      success: true,
      message:
        dto.status === DeliveryLogStatus.Delivered
          ? 'Delivery confirmed successfully'
          : 'Delivery marked as failed',

      data: {
        consumerId: updated.userId,
        dispatchEntryId: updated.dispatchEntryId,
        issueId: updated.issueId,
        status: updated.status,
        deliveryDate: updated.deliveredAt,
        remarks: updated.remarks,
        deliveredBy: updated.deliveredBy,
        proofReference: updated.proofReference,
      },
    };
  }

  private async autoCompleteIfResolved(dispatchEntryId: number): Promise<void> {
    const pendingCount = await this.prisma.deliveryLog.count({
      where: {
        dispatchEntryId,
        status: DeliveryLogStatus.Pending,
      },
    });

    if (pendingCount > 0) {
      return;
    }

    const dispatch = await this.prisma.dispatchEntry.findUnique({
      where: {
        id: dispatchEntryId,
      },
      select: {
        status: true,
      },
    });

    if (
      dispatch &&
      (dispatch.status === DispatchStatus.Received ||
        dispatch.status === DispatchStatus.Discrepancy)
    ) {
      await this.prisma.dispatchEntry.update({
        where: {
          id: dispatchEntryId,
        },
        data: {
          status: DispatchStatus.Completed,
        },
      });
    }
  }
}
