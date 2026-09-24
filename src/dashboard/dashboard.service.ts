import { Injectable } from '@nestjs/common';
import { AuthenticatedUser, UserType } from '@Common';
import { PrismaService } from '../prisma';
import {
  DispatchStatus,
  HierarchyLevel,
  HierarchyStatus,
  PublishIssueStatus,
} from '../generated/prisma/client';
import { PRIVILEGE_CATALOG } from '../roles/privilege-catalog.constant';
import { DashboardSummaryResponseDto, NodeDashboardDispatchDto } from './dto';

// ─── Constants & Selects ──────────────────────────────────────────────────────

const CONSUMER_REGISTER_PRIVILEGE_KEY =
  PRIVILEGE_CATALOG.find(
    (p) =>
      p.module === 'consumers' &&
      (p.action === 'create' ||
        p.description.toLowerCase().includes('register')),
  )?.key ?? 'consumers.create';

const ISSUE_SELECT = {
  id: true,
  issueNo: true,
  title: true,
  publishDate: true,
  totalCopies: true,
  status: true,
} as const;

const NODE_SELECT = {
  id: true,
  name: true,
  level: true,
} as const;

const DESIGNATION_SELECT = {
  id: true,
  name: true,
  level: true,
} as const;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Fast DB-level check to verify if the user has the required privilege.
   * Top-level Admin always has all privileges.
   */
  private async hasPrivilege(
    user: AuthenticatedUser,
    privilegeKey: string,
  ): Promise<boolean> {
    if (user.type === UserType.Admin) {
      return true;
    }

    const count = await this.prisma.admin.count({
      where: {
        id: user.id,
        role: {
          status: 'Active',
          privileges: {
            some: { privilege: { key: privilegeKey } },
          },
        },
      },
    });

    return count > 0;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  async getSummary(
    user: AuthenticatedUser,
  ): Promise<DashboardSummaryResponseDto> {
    // 1. Parallel fetch: privilege check & current published edition
    const [canRegisterConsumer, currentEdition] = await Promise.all([
      this.hasPrivilege(user, CONSUMER_REGISTER_PRIVILEGE_KEY),
      this.prisma.publishIssue.findFirst({
        where: { status: PublishIssueStatus.Published },
        orderBy: { publishDate: 'desc' },
        select: ISSUE_SELECT,
      }),
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Central / Super Administrator (Pattern identical to dispatches.service.ts)
    // ─────────────────────────────────────────────────────────────────────────
    if (user.type === UserType.Admin) {
      if (!currentEdition) {
        return {
          isSuperAdmin: true,
          hasActiveAssignment: true,
          canRegisterConsumer,
          viewHistoryUrl: '/dispatches',
          node: null,
          designation: { id: 0, name: 'Super Administrator', level: 'Central' },
          currentEdition: null,
          dispatch: null,
          centralSummary: null,
        };
      }

      // Parallel fetch: Root Prant nodes + central dispatches + SQL sums
      const [rootPrantNodes, centralDispatches, aggregates] = await Promise.all(
        [
          this.prisma.hierarchyNode.findMany({
            where: {
              level: HierarchyLevel.Prant,
              status: HierarchyStatus.Active,
            },
            select: NODE_SELECT,
            orderBy: { name: 'asc' },
          }),
          this.prisma.dispatchEntry.findMany({
            where: {
              issueId: currentEdition.id,
              fromPointId: null,
              status: { not: DispatchStatus.Cancelled },
            },
            select: {
              toPointId: true,
              quantity: true,
              receivedQuantity: true,
              status: true,
            },
          }),
          this.prisma.dispatchEntry.aggregate({
            where: {
              issueId: currentEdition.id,
              fromPointId: null,
              status: { not: DispatchStatus.Cancelled },
            },
            _sum: { quantity: true, receivedQuantity: true },
          }),
        ],
      );

      const dispatchMap = new Map(
        centralDispatches.map((d) => [d.toPointId, d]),
      );

      const prantDispatches = rootPrantNodes.map((node) => {
        const entry = dispatchMap.get(node.id);
        return {
          prantId: node.id,
          prantName: node.name,
          status: entry ? entry.status : 'NotDispatchedYet',
          dispatchedQuantity: entry ? entry.quantity : 0,
          receivedQuantity: entry ? entry.receivedQuantity : null,
        };
      });

      const totalDispatched = aggregates._sum.quantity ?? 0;
      const totalReceived = aggregates._sum.receivedQuantity ?? 0;

      return {
        isSuperAdmin: true,
        hasActiveAssignment: true,
        canRegisterConsumer,
        viewHistoryUrl: '/dispatches',
        node: null,
        designation: { id: 0, name: 'Super Administrator', level: 'Central' },
        currentEdition,
        dispatch: null,
        centralSummary: {
          totalCopiesPublished: currentEdition.totalCopies,
          totalCopiesDispatched: totalDispatched,
          totalCopiesReceivedAtPrant: totalReceived,
          remainingCentralStock: Math.max(
            0,
            currentEdition.totalCopies - totalDispatched,
          ),
          prantDispatches,
        },
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Node Administrator
    // ─────────────────────────────────────────────────────────────────────────
    const activeAssignment =
      await this.prisma.userHierarchyDesignation.findFirst({
        where: { userId: user.id, isActive: true },
        include: {
          node: { select: NODE_SELECT },
          designation: { select: DESIGNATION_SELECT },
        },
        orderBy: { assignedAt: 'desc' },
      });

    if (!activeAssignment) {
      return {
        isSuperAdmin: false,
        hasActiveAssignment: false,
        canRegisterConsumer,
        viewHistoryUrl: '/dispatches',
        node: null,
        designation: null,
        currentEdition,
        dispatch: null,
        centralSummary: null,
      };
    }

    const { node, designation } = activeAssignment;
    const viewHistoryUrl = `/dispatches?toPointId=${node.id}`;

    if (!currentEdition) {
      return {
        isSuperAdmin: false,
        hasActiveAssignment: true,
        canRegisterConsumer,
        viewHistoryUrl,
        node,
        designation,
        currentEdition: null,
        dispatch: null,
        centralSummary: null,
      };
    }

    // Parallel fetch: incoming dispatch + SQL sum of forwarded copies
    const [incomingDispatch, forwardedAggregate] = await Promise.all([
      this.prisma.dispatchEntry.findFirst({
        where: {
          issueId: currentEdition.id,
          toPointId: node.id,
          status: { not: DispatchStatus.Cancelled },
        },
        orderBy: [{ dispatchDate: 'desc' }, { id: 'desc' }],
        include: {
          fromPoint: { select: NODE_SELECT },
        },
      }),
      this.prisma.dispatchEntry.aggregate({
        where: {
          issueId: currentEdition.id,
          fromPointId: node.id,
          status: { not: DispatchStatus.Cancelled },
        },
        _sum: { quantity: true },
      }),
    ]);

    let dispatch: NodeDashboardDispatchDto;

    if (!incomingDispatch) {
      // Case C: Consignment has not been dispatched to this node yet
      dispatch = { status: 'NotDispatchedYet' };
    } else if (
      incomingDispatch.status === DispatchStatus.Dispatched ||
      incomingDispatch.status === DispatchStatus.InTransit
    ) {
      // Case A: Dispatched/InTransit -> show expected quantity ONLY, received is hidden
      dispatch = {
        status: incomingDispatch.status,
        expectedQuantity: incomingDispatch.quantity,
        incomingDispatchId: incomingDispatch.id,
        dispatchDate: incomingDispatch.dispatchDate,
        trackingLink: incomingDispatch.trackingLink,
        fromPoint: incomingDispatch.fromPoint,
      };
    } else {
      // Case B: Received / Forwarded / Discrepancy / Completed
      const receivedQuantity = incomingDispatch.receivedQuantity ?? 0;
      const forwardedQuantity = forwardedAggregate._sum.quantity ?? 0;
      const remainingQuantity = Math.max(
        0,
        receivedQuantity - forwardedQuantity,
      );

      dispatch = {
        status: incomingDispatch.status,
        receivedQuantity,
        forwardedQuantity,
        remainingQuantity,
        incomingDispatchId: incomingDispatch.id,
        dispatchDate: incomingDispatch.dispatchDate,
        trackingLink: incomingDispatch.trackingLink,
        fromPoint: incomingDispatch.fromPoint,
      };
    }

    return {
      isSuperAdmin: false,
      hasActiveAssignment: true,
      canRegisterConsumer,
      viewHistoryUrl,
      node,
      designation,
      currentEdition,
      dispatch,
      centralSummary: null,
    };
  }

  // Alias for backward compatibility
  getDashboardSummary(user: AuthenticatedUser) {
    return this.getSummary(user);
  }
}
