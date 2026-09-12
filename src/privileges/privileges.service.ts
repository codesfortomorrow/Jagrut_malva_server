import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma } from '../generated/prisma/client';
import { GetPrivilegesRequestDto } from './dto';

@Injectable()
export class PrivilegesService {
  constructor(private readonly prisma: PrismaService) {}

  // FIND ALL
  async findAll(query?: GetPrivilegesRequestDto) {
    const search = query?.search?.trim();
    const skip = query?.skip ?? 0;
    const take = query?.take ?? 10;

    const where: Prisma.PrivilegeWhereInput = {};

    if (search) {
      where.OR = [
        {
          key: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          label: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [privileges, total] = await Promise.all([
      this.prisma.privilege.findMany({
        where,
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
      this.prisma.privilege.count({ where }),
    ]);

    return {
      result: privileges,
      total,
      skip,
      take,
    };
  }

  // FIND ONE BY ID
  async findOne(id: number) {
    const privilege = await this.prisma.privilege.findUnique({
      where: { id },
    });

    if (!privilege) {
      throw new NotFoundException(`Privilege with ID ${id} not found`);
    }

    return privilege;
  }

  // FIND ONE BY KEY (Helper for service-level lookups)
  async findByKey(key: string) {
    const privilege = await this.prisma.privilege.findUnique({
      where: { key },
    });

    if (!privilege) {
      throw new NotFoundException(`Privilege with key '${key}' not found`);
    }

    return privilege;
  }
}
