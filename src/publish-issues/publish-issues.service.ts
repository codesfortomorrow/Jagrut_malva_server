import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { join } from 'node:path';
import { StorageService, File } from '@Common';
import { PrismaService } from '../prisma';
import {
  Prisma,
  PublishIssue,
  PublishIssueStatus,
} from '../generated/prisma/client';
import { CreatePublishIssueRequestDto } from './dto/create-publish-issue-request.dto';
import { UpdatePublishIssueRequestDto } from './dto/update-publish-issue-request.dto';
import { GetPublishIssuesRequestDto } from './dto/get-publish-issues-request.dto';

const ISSUES_STORAGE_DIR = 'issues';

@Injectable()
export class PublishIssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  private attachFileUrl(issue: PublishIssue) {
    return {
      ...issue,
      fileUrl: issue.filePath
        ? this.storageService.getFileUrl(issue.filePath)
        : null,
    };
  }

  async findOne(id: number) {
    const issue = await this.prisma.publishIssue.findUnique({
      where: { id },
    });
    if (!issue) {
      throw new NotFoundException(`Publish issue with ID ${id} not found`);
    }
    return this.attachFileUrl(issue);
  }

  async findAll(query: GetPublishIssuesRequestDto) {
    const where: Prisma.PublishIssueWhereInput = {};

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { issueNo: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.publishDate = {
        ...(query.startDate && { gte: query.startDate }),
        ...(query.endDate && { lte: query.endDate }),
      };
    }

    const count = await this.prisma.publishIssue.count({ where });

    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const issues = await this.prisma.publishIssue.findMany({
      where,
      skip,
      take,
      orderBy: { publishDate: 'desc' },
    });

    const data = issues.map((issue) => this.attachFileUrl(issue));

    return { count, skip, take, data };
  }

  async create(dto: CreatePublishIssueRequestDto, file?: File) {
    if (dto.totalCopies <= 0) {
      throw new BadRequestException(
        'totalCopies must be a positive integer greater than 0',
      );
    }

    const duplicate = await this.prisma.publishIssue.count({
      where: {
        issueNo: { equals: dto.issueNo, mode: 'insensitive' },
      },
    });

    if (duplicate > 0) {
      throw new BadRequestException(
        `A publish issue with issueNo '${dto.issueNo}' already exists`,
      );
    }

    let filePath: string | null = null;

    if (file) {
      await this.storageService.move(file.filename, ISSUES_STORAGE_DIR);
      filePath = join(ISSUES_STORAGE_DIR, file.filename);
    }

    const initialStatus = dto.status ?? PublishIssueStatus.Draft;
    if (initialStatus === PublishIssueStatus.Archived) {
      throw new BadRequestException(
        'Cannot create an issue directly in Archived status',
      );
    }
    if (initialStatus === PublishIssueStatus.Published && !filePath) {
      throw new BadRequestException(
        'Cannot publish an issue without an uploaded issue file or cover image',
      );
    }

    try {
      const issue = await this.prisma.publishIssue.create({
        data: {
          issueNo: dto.issueNo,
          title: dto.title ?? 'Jagrat Malwa Patrika',
          totalCopies: dto.totalCopies,
          pricePerCopy: dto.pricePerCopy ?? null,
          pageCount: dto.pageCount ?? null,
          publishDate: dto.publishDate,
          filePath,
          status: initialStatus,
        },
      });

      return this.attachFileUrl(issue);
    } catch (err) {
      // Clean up uploaded file if DB creation fails
      if (filePath) {
        await this.storageService.removeFile(filePath);
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException(
          `A publish issue with issueNo '${dto.issueNo}' already exists`,
        );
      }
      throw err;
    }
  }

  async update(id: number, dto: UpdatePublishIssueRequestDto, file?: File) {
    const existing = await this.findOne(id);

    // Enforce safe lifecycle transitions and edit protections
    if (existing.status === PublishIssueStatus.Archived) {
      if (dto.status === PublishIssueStatus.Archived) {
        throw new BadRequestException('Issue is already in Archived status');
      }
      if (dto.status === PublishIssueStatus.Published) {
        throw new BadRequestException('Cannot publish an archived issue');
      }
      if (dto.status === PublishIssueStatus.Draft) {
        throw new BadRequestException('Cannot move an archived issue to draft');
      }
      throw new BadRequestException(
        'Cannot modify an archived issue. Archived issues are in an inactive historical state',
      );
    }

    if (existing.status === PublishIssueStatus.Published) {
      if (dto.status === PublishIssueStatus.Published) {
        throw new BadRequestException('Issue is already in Published status');
      }
      if (dto.status === PublishIssueStatus.Draft) {
        throw new BadRequestException(
          'Cannot revert a published issue to draft status',
        );
      }
      if (
        dto.status === undefined &&
        (dto.issueNo ||
          dto.publishDate ||
          dto.totalCopies ||
          file ||
          dto.title ||
          dto.pricePerCopy ||
          dto.pageCount)
      ) {
        throw new BadRequestException(
          'Cannot edit metadata of a published issue. Only status transition to Archived is permitted',
        );
      }
      if (dto.status === PublishIssueStatus.Archived) {
        if (
          dto.issueNo ||
          dto.publishDate ||
          dto.totalCopies ||
          file ||
          dto.title ||
          dto.pricePerCopy ||
          dto.pageCount
        ) {
          throw new BadRequestException(
            'Cannot edit metadata when archiving a published issue',
          );
        }
      }
    }

    if (existing.status === PublishIssueStatus.Draft) {
      if (dto.status === PublishIssueStatus.Draft) {
        throw new BadRequestException('Issue is already in Draft status');
      }
      if (dto.status === PublishIssueStatus.Archived) {
        throw new BadRequestException(
          'Cannot archive a draft issue directly. Only published issues can be archived',
        );
      }
      if (dto.status === PublishIssueStatus.Published) {
        const finalFilePath = file ? file.filename : existing.filePath;
        if (!finalFilePath) {
          throw new BadRequestException(
            'Cannot publish an issue without an uploaded issue file or asset reference',
          );
        }
        const finalCopies = dto.totalCopies ?? existing.totalCopies;
        if (finalCopies <= 0) {
          throw new BadRequestException(
            'totalCopies must be greater than 0 to publish',
          );
        }
      }
    }

    if (dto.totalCopies !== undefined && dto.totalCopies <= 0) {
      throw new BadRequestException(
        'totalCopies must be a positive integer greater than 0',
      );
    }

    if (dto.issueNo && dto.issueNo !== existing.issueNo) {
      const duplicate = await this.prisma.publishIssue.count({
        where: {
          issueNo: { equals: dto.issueNo, mode: 'insensitive' },
          NOT: { id },
        },
      });
      if (duplicate > 0) {
        throw new BadRequestException(
          `A publish issue with issueNo '${dto.issueNo}' already exists`,
        );
      }
    }

    let newFilePath: string | undefined = undefined;
    let newFileStored = false;

    // 1. Move and store the new file FIRST before touching existing files or database
    if (file) {
      await this.storageService.move(file.filename, ISSUES_STORAGE_DIR);
      newFilePath = join(ISSUES_STORAGE_DIR, file.filename);
      newFileStored = true;
    }

    const updateData: Prisma.PublishIssueUpdateInput = {
      ...(dto.issueNo !== undefined && { issueNo: dto.issueNo }),
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.publishDate !== undefined && { publishDate: dto.publishDate }),
      ...(dto.totalCopies !== undefined && { totalCopies: dto.totalCopies }),
      ...(dto.pricePerCopy !== undefined && { pricePerCopy: dto.pricePerCopy }),
      ...(dto.pageCount !== undefined && { pageCount: dto.pageCount }),
      ...(newFilePath !== undefined && { filePath: newFilePath }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    try {
      // 2. Database update must succeed with the new path
      const updated = await this.prisma.publishIssue.update({
        where: { id },
        data: updateData,
      });

      // 3. Old file is removed ONLY AFTER the new file/reference is safely persisted in DB
      if (
        newFileStored &&
        existing.filePath &&
        existing.filePath !== newFilePath
      ) {
        await this.storageService.removeFile(existing.filePath);
      }

      return this.attachFileUrl(updated);
    } catch (err) {
      // If database update fails, clean up the newly moved file so we avoid orphan files
      if (newFileStored && newFilePath) {
        await this.storageService.removeFile(newFilePath);
      }

      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException(
          `A publish issue with issueNo '${dto.issueNo}' already exists`,
        );
      }
      throw err;
    }
  }
}
