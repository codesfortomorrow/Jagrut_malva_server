import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DispatchStatus,
  HierarchyLevel,
  PublishIssueStatus,
} from '../../generated/prisma/client';

export class DashboardCurrentIssueDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'JM-2026-09' })
  issueNo: string;

  @ApiProperty({ example: 'September 2026 Edition' })
  title: string;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  publishDate: Date;

  @ApiProperty({ example: 10000 })
  totalCopies: number;

  @ApiProperty({
    enum: PublishIssueStatus,
    example: PublishIssueStatus.Published,
  })
  status: PublishIssueStatus;
}

export class DashboardNodeSummaryDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: 'Ujjain District Node' })
  name: string;

  @ApiProperty({ enum: HierarchyLevel, example: HierarchyLevel.Jila })
  level: HierarchyLevel;
}

export class DashboardDesignationSummaryDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'Jila Prabhari' })
  name: string;

  @ApiProperty({ example: 'Jila' })
  level: string;
}

export class SuperAdminPrantDispatchDto {
  @ApiProperty({ example: 2 })
  prantId: number;

  @ApiProperty({ example: 'Malwa Prant' })
  prantName: string;

  @ApiProperty({
    example: 'Dispatched',
    description:
      "Dispatch status to this Prant: 'NotDispatchedYet', 'Dispatched', 'InTransit', 'Received', 'Discrepancy', 'Forwarded', or 'Completed'",
  })
  status: string;

  @ApiProperty({ example: 2500 })
  dispatchedQuantity: number;

  @ApiPropertyOptional({ example: 2500, nullable: true })
  receivedQuantity?: number | null;
}

export class SuperAdminDashboardSummaryDto {
  @ApiProperty({ example: 10000 })
  totalCopiesPublished: number;

  @ApiProperty({ example: 7500 })
  totalCopiesDispatched: number;

  @ApiProperty({ example: 5000 })
  totalCopiesReceivedAtPrant: number;

  @ApiProperty({ example: 2500 })
  remainingCentralStock: number;

  @ApiProperty({ type: [SuperAdminPrantDispatchDto] })
  prantDispatches: SuperAdminPrantDispatchDto[];
}

export class NodeDashboardDispatchDto {
  @ApiProperty({
    example: 'Received',
    description:
      "Status of incoming dispatch for current node: 'NotDispatchedYet', 'Dispatched', 'InTransit', 'Received', 'Discrepancy', 'Forwarded', or 'Completed'",
  })
  status: string;

  @ApiPropertyOptional({
    example: 500,
    description:
      'Expected copies in transit (only populated when status is Dispatched or InTransit)',
  })
  expectedQuantity?: number;

  @ApiPropertyOptional({
    example: 500,
    description:
      'Verified received copies (only populated when status is Received, Discrepancy, Forwarded, or Completed)',
  })
  receivedQuantity?: number;

  @ApiPropertyOptional({
    example: 300,
    description:
      'Total copies forwarded downstream to lower nodes for current edition',
  })
  forwardedQuantity?: number;

  @ApiPropertyOptional({
    example: 200,
    description:
      'Copies remaining at current node (receivedQuantity - forwardedQuantity)',
  })
  remainingQuantity?: number;

  @ApiPropertyOptional({ example: 12 })
  incomingDispatchId?: number;

  @ApiPropertyOptional({ example: '2026-09-10T10:00:00.000Z' })
  dispatchDate?: Date;

  @ApiPropertyOptional({ example: 'https://courier.track/123', nullable: true })
  trackingLink?: string | null;

  @ApiPropertyOptional({ type: DashboardNodeSummaryDto, nullable: true })
  fromPoint?: DashboardNodeSummaryDto | null;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ example: false })
  isSuperAdmin: boolean;

  @ApiProperty({ example: true })
  hasActiveAssignment: boolean;

  @ApiProperty({
    example: true,
    description:
      'Flag indicating whether the current user has permission to register consumers',
  })
  canRegisterConsumer: boolean;

  @ApiProperty({
    example: '/dispatches?toPointId=5',
    description:
      'URL endpoint pointing to dispatch history for current user node or all dispatches for SuperAdmin',
  })
  viewHistoryUrl: string;

  @ApiPropertyOptional({ type: DashboardNodeSummaryDto, nullable: true })
  node?: DashboardNodeSummaryDto | null;

  @ApiPropertyOptional({ type: DashboardDesignationSummaryDto, nullable: true })
  designation?: DashboardDesignationSummaryDto | null;

  @ApiPropertyOptional({ type: DashboardCurrentIssueDto, nullable: true })
  currentEdition: DashboardCurrentIssueDto | null;

  @ApiPropertyOptional({
    type: NodeDashboardDispatchDto,
    nullable: true,
    description: 'Dispatch metrics for node admin (null for SuperAdmin)',
  })
  dispatch?: NodeDashboardDispatchDto | null;

  @ApiPropertyOptional({
    type: SuperAdminDashboardSummaryDto,
    nullable: true,
    description:
      'Aggregated dispatch metrics across root Prant nodes for Central/SuperAdmin (null for node admin)',
  })
  centralSummary?: SuperAdminDashboardSummaryDto | null;
}
