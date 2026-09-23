import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma, UserStatus } from '../generated/prisma/client';
import {
  CreateConsumerRequestDto,
  GetConsumersRequestDto,
  UpdateConsumerRequestDto,
} from './dto';

const CONSUMER_INCLUDE = {
  jila: { select: { id: true, name: true, level: true } },
  khand: { select: { id: true, name: true, level: true } },
  mandal: { select: { id: true, name: true, level: true } },
  gram: { select: { id: true, name: true, level: true } },
  registeredBy: {
    select: { id: true, firstname: true, lastname: true, email: true },
  },
} as const;

@Injectable()
export class ConsumersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates that Jila -> Khand -> Mandal -> Gram form an exact parent-child hierarchy chain.
   */
  private async validateHierarchy(
    jilaId: number,
    khandId: number,
    mandalId: number,
    gramId: number,
  ) {
    const [khand, mandal, gram] = await Promise.all([
      this.prisma.hierarchyNode.findUnique({ where: { id: khandId } }),
      this.prisma.hierarchyNode.findUnique({ where: { id: mandalId } }),
      this.prisma.hierarchyNode.findUnique({ where: { id: gramId } }),
    ]);

    if (!khand || khand.parentId !== jilaId) {
      throw new BadRequestException(
        'Selected Khand does not belong to selected Jila',
      );
    }
    if (!mandal || mandal.parentId !== khandId) {
      throw new BadRequestException(
        'Selected Mandal does not belong to selected Khand',
      );
    }
    if (!gram || gram.parentId !== mandalId) {
      throw new BadRequestException(
        'Selected Gram does not belong to selected Mandal',
      );
    }
  }

  async findAll(query: GetConsumersRequestDto) {
    const search = query.search?.trim();
    const where: Prisma.ConsumerWhereInput = {
      ...(query.jilaId && { jilaId: query.jilaId }),
      ...(query.khandId && { khandId: query.khandId }),
      ...(query.mandalId && { mandalId: query.mandalId }),
      ...(query.gramId && { gramId: query.gramId }),
      ...(query.status && { status: query.status }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { fatherName: { contains: search, mode: 'insensitive' } },
          { whatsappMobile: { contains: search } },
          { fullAddress: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const [count, data] = await Promise.all([
      this.prisma.consumer.count({ where }),
      this.prisma.consumer.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: CONSUMER_INCLUDE,
      }),
    ]);

    return { count, skip, take, data };
  }

  async findOne(id: number) {
    const consumer = await this.prisma.consumer.findUnique({
      where: { id },
      include: CONSUMER_INCLUDE,
    });
    if (!consumer) {
      throw new NotFoundException(`Consumer with ID ${id} not found`);
    }
    return consumer;
  }

  async create(dto: CreateConsumerRequestDto, userId?: number) {
    await this.validateHierarchy(
      dto.jilaId,
      dto.khandId,
      dto.mandalId,
      dto.gramId,
    );

    const duplicate = await this.prisma.consumer.findUnique({
      where: { whatsappMobile: dto.whatsappMobile },
    });
    if (duplicate) {
      throw new BadRequestException(
        `A consumer with WhatsApp number '${dto.whatsappMobile}' already exists (${duplicate.fullName})`,
      );
    }

    return this.prisma.consumer.create({
      data: {
        ...dto,
        registrarName: dto.registrarName || 'Admin',
        registrarMobile: dto.registrarMobile || dto.whatsappMobile,
        registeredById: userId ?? null,
      },
      include: CONSUMER_INCLUDE,
    });
  }

  async update(id: number, dto: UpdateConsumerRequestDto) {
    const existing = await this.findOne(id);

    if (dto.jilaId || dto.khandId || dto.mandalId || dto.gramId) {
      await this.validateHierarchy(
        dto.jilaId ?? existing.jilaId,
        dto.khandId ?? existing.khandId,
        dto.mandalId ?? existing.mandalId,
        dto.gramId ?? existing.gramId,
      );
    }

    if (dto.whatsappMobile && dto.whatsappMobile !== existing.whatsappMobile) {
      const duplicate = await this.prisma.consumer.findUnique({
        where: { whatsappMobile: dto.whatsappMobile },
      });
      if (duplicate && duplicate.id !== id) {
        throw new BadRequestException(
          `WhatsApp number '${dto.whatsappMobile}' is already in use (${duplicate.fullName})`,
        );
      }
    }

    return this.prisma.consumer.update({
      where: { id },
      data: dto,
      include: CONSUMER_INCLUDE,
    });
  }

  async setStatus(id: number, status: UserStatus) {
    await this.findOne(id);
    return this.prisma.consumer.update({
      where: { id },
      data: { status },
      include: CONSUMER_INCLUDE,
    });
  }
}
