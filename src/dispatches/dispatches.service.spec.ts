import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DispatchesService } from './dispatches.service';
import {
  DispatchStatus,
  HierarchyLevel,
  PublishIssueStatus,
} from '../generated/prisma/client';

describe('DispatchesService', () => {
  let service: DispatchesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      dispatchEntry: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      publishIssue: {
        findUnique: jest.fn(),
      },
      hierarchyNode: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(mockPrisma)),
    };

    service = new DispatchesService(mockPrisma);
  });

  describe('issue status validation for dispatch', () => {
    it('should reject dispatching a Draft issue', async () => {
      mockPrisma.publishIssue.findUnique.mockResolvedValue({
        id: 1,
        issueNo: 'ISSUE-01',
        status: PublishIssueStatus.Draft,
      });

      await expect(
        service.create({
          issueId: 1,
          toPointId: 10,
          quantity: 100,
        }),
      ).rejects.toThrow('Only Published issues can be dispatched');
    });

    it('should reject dispatching an Archived issue', async () => {
      mockPrisma.publishIssue.findUnique.mockResolvedValue({
        id: 1,
        issueNo: 'ISSUE-01',
        status: PublishIssueStatus.Archived,
      });

      await expect(
        service.create({
          issueId: 1,
          toPointId: 10,
          quantity: 100,
        }),
      ).rejects.toThrow('Only Published issues can be dispatched');
    });

    it('should allow dispatching a Published issue from central publisher to Sangh', async () => {
      mockPrisma.publishIssue.findUnique.mockResolvedValue({
        id: 1,
        issueNo: 'ISSUE-01',
        totalCopies: 1000,
        status: PublishIssueStatus.Published,
      });

      mockPrisma.hierarchyNode.findUnique.mockResolvedValue({
        id: 10,
        name: 'MP Sangh',
        level: HierarchyLevel.Sangh,
      });

      mockPrisma.dispatchEntry.findMany.mockResolvedValue([]);
      mockPrisma.dispatchEntry.findFirst.mockResolvedValue(null);
      mockPrisma.dispatchEntry.create.mockResolvedValue({
        id: 101,
        issueId: 1,
        fromPointId: null,
        toPointId: 10,
        quantity: 500,
        status: DispatchStatus.Dispatched,
      });

      const result = await service.create({
        issueId: 1,
        toPointId: 10,
        quantity: 500,
      });

      expect(result.status).toBe(DispatchStatus.Dispatched);
    });
  });

  describe('hierarchy validation', () => {
    it('should reject central dispatch to non-Sangh node', async () => {
      mockPrisma.publishIssue.findUnique.mockResolvedValue({
        id: 1,
        status: PublishIssueStatus.Published,
        totalCopies: 1000,
      });

      mockPrisma.hierarchyNode.findUnique.mockResolvedValue({
        id: 20,
        name: 'Indore Jila',
        level: HierarchyLevel.Jila,
      });

      await expect(
        service.create({
          issueId: 1,
          toPointId: 20,
          quantity: 200,
        }),
      ).rejects.toThrow('Central publisher can only dispatch to root');
    });

    it('should reject dispatch if source and destination are the same', async () => {
      mockPrisma.publishIssue.findUnique.mockResolvedValue({
        id: 1,
        status: PublishIssueStatus.Published,
      });

      mockPrisma.hierarchyNode.findUnique.mockResolvedValue({
        id: 10,
        name: 'MP Sangh',
        level: HierarchyLevel.Sangh,
      });

      await expect(
        service.create({
          issueId: 1,
          fromPointId: 10,
          toPointId: 10,
          quantity: 100,
        }),
      ).rejects.toThrow(
        'Source and destination hierarchy points cannot be the same',
      );
    });

    it('should reject invalid hierarchy level jump (e.g. Sangh -> KhandNagar)', async () => {
      mockPrisma.publishIssue.findUnique.mockResolvedValue({
        id: 1,
        status: PublishIssueStatus.Published,
      });

      mockPrisma.hierarchyNode.findUnique
        .mockResolvedValueOnce({
          id: 30,
          name: 'MP Khand',
          level: HierarchyLevel.KhandNagar,
          parentId: 10,
        })
        .mockResolvedValueOnce({
          id: 10,
          name: 'MP Sangh',
          level: HierarchyLevel.Sangh,
        });

      await expect(
        service.create({
          issueId: 1,
          fromPointId: 10,
          toPointId: 30,
          quantity: 100,
        }),
      ).rejects.toThrow('Invalid hierarchy jump');
    });
  });

  describe('upstream receipt and stock enforcement', () => {
    it('should block downstream dispatch if upstream consignment is not received yet', async () => {
      mockPrisma.publishIssue.findUnique.mockResolvedValue({
        id: 1,
        issueNo: 'ISSUE-01',
        status: PublishIssueStatus.Published,
      });

      mockPrisma.hierarchyNode.findUnique
        .mockResolvedValueOnce({
          id: 20,
          name: 'Indore Jila',
          level: HierarchyLevel.Jila,
          parentId: 10,
        })
        .mockResolvedValueOnce({
          id: 10,
          name: 'MP Sangh',
          level: HierarchyLevel.Sangh,
        });

      // Upstream is still InTransit, not Received
      mockPrisma.dispatchEntry.findMany.mockResolvedValue([
        {
          id: 50,
          status: DispatchStatus.InTransit,
          toPointId: 10,
        },
      ]);

      await expect(
        service.create({
          issueId: 1,
          fromPointId: 10,
          toPointId: 20,
          quantity: 50,
        }),
      ).rejects.toThrow('has not been received yet');
    });
  });

  describe('receive consignment', () => {
    it('should mark status as Received when receivedQuantity equals quantity', async () => {
      mockPrisma.dispatchEntry.findUnique.mockResolvedValue({
        id: 101,
        quantity: 500,
        status: DispatchStatus.InTransit,
      });

      mockPrisma.dispatchEntry.update.mockResolvedValue({
        id: 101,
        receivedQuantity: 500,
        status: DispatchStatus.Received,
      });

      const res = await service.receive(101, { receivedQuantity: 500 }, 42);
      expect(res.status).toBe(DispatchStatus.Received);
    });

    it('should mark status as Discrepancy when receivedQuantity is less than quantity', async () => {
      mockPrisma.dispatchEntry.findUnique.mockResolvedValue({
        id: 101,
        quantity: 500,
        status: DispatchStatus.InTransit,
      });

      mockPrisma.dispatchEntry.update.mockResolvedValue({
        id: 101,
        receivedQuantity: 480,
        status: DispatchStatus.Discrepancy,
      });

      const res = await service.receive(101, { receivedQuantity: 480 }, 42);
      expect(res.status).toBe(DispatchStatus.Discrepancy);
    });

    it('should reject receiving more copies than dispatched', async () => {
      mockPrisma.dispatchEntry.findUnique.mockResolvedValue({
        id: 101,
        quantity: 500,
        status: DispatchStatus.InTransit,
      });

      await expect(
        service.receive(101, { receivedQuantity: 505 }, 42),
      ).rejects.toThrow('cannot be greater than dispatched quantity');
    });
  });

  describe('in-transit and cancel transitions', () => {
    it('should only allow Dispatched -> InTransit', async () => {
      mockPrisma.dispatchEntry.findUnique.mockResolvedValue({
        id: 101,
        status: DispatchStatus.Received,
      });

      await expect(service.setInTransit(101)).rejects.toThrow(
        'Only Dispatched records can move to InTransit',
      );
    });

    it('should cancel an unreceived dispatch and preserve record', async () => {
      mockPrisma.dispatchEntry.findUnique.mockResolvedValue({
        id: 101,
        status: DispatchStatus.InTransit,
      });

      mockPrisma.dispatchEntry.update.mockResolvedValue({
        id: 101,
        status: DispatchStatus.Cancelled,
      });

      const res = await service.cancel(101);
      expect(res.status).toBe(DispatchStatus.Cancelled);
    });

    it('should reject cancelling a Received dispatch', async () => {
      mockPrisma.dispatchEntry.findUnique.mockResolvedValue({
        id: 101,
        status: DispatchStatus.Received,
      });

      await expect(service.cancel(101)).rejects.toThrow(
        'Chain-of-custody records cannot be cancelled once received',
      );
    });
  });

  describe('forwarding', () => {
    it('should create a new DispatchEntry and set source to Forwarded', async () => {
      mockPrisma.dispatchEntry.findUnique.mockResolvedValue({
        id: 101,
        issueId: 1,
        toPointId: 10,
        toPoint: { id: 10, name: 'MP Sangh', level: HierarchyLevel.Sangh },
        status: DispatchStatus.Received,
        issue: { issueNo: 'ISSUE-01' },
      });

      mockPrisma.hierarchyNode.findUnique.mockResolvedValue({
        id: 20,
        name: 'Indore Jila',
        level: HierarchyLevel.Jila,
        parentId: 10,
      });

      // Upstream mock for stock verification
      mockPrisma.dispatchEntry.findMany
        .mockResolvedValueOnce([
          {
            id: 101,
            status: DispatchStatus.Received,
            receivedQuantity: 500,
          },
        ])
        .mockResolvedValueOnce([]); // No downstream dispatches yet

      mockPrisma.dispatchEntry.findFirst.mockResolvedValue(null);

      mockPrisma.dispatchEntry.create.mockResolvedValue({
        id: 102,
        issueId: 1,
        fromPointId: 10,
        toPointId: 20,
        quantity: 200,
        status: DispatchStatus.Dispatched,
      });

      const res = await service.forward(101, {
        toPointId: 20,
        quantity: 200,
      });

      expect(res.id).toBe(102);
      expect(mockPrisma.dispatchEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 101 },
          data: { status: DispatchStatus.Forwarded },
        }),
      );
    });
  });
});
