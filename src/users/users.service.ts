import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HierarchyLevel,
  HierarchyNode,
  HierarchyStatus,
  Prisma,
  User,
  UserStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma';
import {
  CreateUserRequestDto,
  GetUsersRequestDto,
  UpdateUserRequestDto,
} from './dto';

const USER_INCLUDE = {
  vibhag: { select: { id: true, name: true, level: true } },
  jila: { select: { id: true, name: true, level: true } },
  khand: { select: { id: true, name: true, level: true } },
  mandal: { select: { id: true, name: true, level: true } },
  gram: { select: { id: true, name: true, level: true } },
  registeredBy: {
    select: { id: true, firstname: true, lastname: true, email: true },
  },
  subscriptions: {
    orderBy: { createdAt: 'desc' },
  },
} as const;

export type UserWithRelations = Prisma.UserGetPayload<{
  include: typeof USER_INCLUDE;
}>;

// Shape returned by getUserById() / findAllUsers(): the raw relations plus
// a convenience `activeSubscription` pulled out of the `subscriptions` array.
export type UserWithSubscriptionSummary = UserWithRelations & {
  activeSubscription: UserWithRelations['subscriptions'][number] | null;
};

export interface PaginatedResult<T> {
  count: number;
  skip: number;
  take: number;
  data: T[];
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private hasHierarchyChanges(dto: UpdateUserRequestDto): boolean {
    return (
      dto.vibhagId !== undefined ||
      dto.jilaId !== undefined ||
      dto.khandId !== undefined ||
      dto.mandalId !== undefined ||
      dto.gramId !== undefined
    );
  }

  private handleUserPersistenceError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'A user with this WhatsApp number is already registered',
        );
      }

      if (error.code === 'P2003') {
        throw new BadRequestException(
          'One of the provided hierarchy ids no longer exists',
        );
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
    }

    throw error;
  }

  private assertHierarchyRelationship(
    child: HierarchyNode,
    parent: HierarchyNode,
    message: string,
  ): void {
    if (child.parentId !== parent.id) {
      throw new BadRequestException(message);
    }
  }

  private async assertMobileNumbersAreDistinct(params: {
    whatsappMobile: string;
    additionalMobile?: string | null;
  }): Promise<void> {
    if (
      params.additionalMobile &&
      params.additionalMobile === params.whatsappMobile
    ) {
      throw new BadRequestException(
        'additionalMobile must be different from whatsappMobile',
      );
    }
  }

  private async assertWhatsappMobileIsAvailable(
    whatsappMobile: string,
    excludeUserId?: number,
  ): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: {
        whatsappMobile,
      },
      select: {
        id: true,
      },
    });

    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException(
        'A user with this WhatsApp number is already registered',
      );
    }
  }

  private async loadAndValidateHierarchyChain(params: {
    vibhagId: number;
    jilaId: number;
    khandId: number;
    mandalId: number;
    gramId: number;
  }): Promise<{
    vibhag: HierarchyNode;
    jila: HierarchyNode;
    khand: HierarchyNode;
    mandal: HierarchyNode;
    gram: HierarchyNode;
  }> {
    const [vibhag, jila, khand, mandal, gram] = await Promise.all([
      this.prisma.hierarchyNode.findUnique({
        where: { id: params.vibhagId },
      }),

      this.prisma.hierarchyNode.findUnique({
        where: { id: params.jilaId },
      }),

      this.prisma.hierarchyNode.findUnique({
        where: { id: params.khandId },
      }),

      this.prisma.hierarchyNode.findUnique({
        where: { id: params.mandalId },
      }),

      this.prisma.hierarchyNode.findUnique({
        where: { id: params.gramId },
      }),
    ]);

    this.assertValidNode(vibhag, HierarchyLevel.Vibhag, 'vibhagId');

    this.assertValidNode(jila, HierarchyLevel.Jila, 'jilaId');

    this.assertValidNode(khand, HierarchyLevel.Khand, 'khandId');

    this.assertValidNode(mandal, HierarchyLevel.Mandal, 'mandalId');

    this.assertValidNode(gram, HierarchyLevel.Gram, 'gramId');

    this.assertHierarchyRelationship(
      jila,
      vibhag,
      'jilaId does not belong to the given vibhagId',
    );

    this.assertHierarchyRelationship(
      khand,
      jila,
      'khandId does not belong to the given jilaId',
    );

    this.assertHierarchyRelationship(
      mandal,
      khand,
      'mandalId does not belong to the given khandId',
    );

    this.assertHierarchyRelationship(
      gram,
      mandal,
      'gramId does not belong to the given mandalId',
    );

    return {
      vibhag,
      jila,
      khand,
      mandal,
      gram,
    };
  }

  private assertValidNode(
    node: HierarchyNode | null,
    expectedLevel: HierarchyLevel,
    field: string,
  ): asserts node is HierarchyNode {
    if (!node) {
      throw new NotFoundException(
        `${field} does not reference an existing location`,
      );
    }

    if (node.level !== expectedLevel) {
      throw new BadRequestException(
        `${field} must reference a ${expectedLevel} level location`,
      );
    }

    if (node.status !== HierarchyStatus.Active) {
      throw new BadRequestException(`${field} references an inactive location`);
    }
  }

  private formatUser(user: UserWithRelations): UserWithSubscriptionSummary {
    const activeSubscription =
      user.subscriptions.find((s) => s.isActive) ?? null;

    return {
      ...user,
      activeSubscription,
    };
  }

  async registerUser(
    dto: CreateUserRequestDto,
    registeredById: number,
  ): Promise<User> {
    await this.assertMobileNumbersAreDistinct(dto);
    await this.assertWhatsappMobileIsAvailable(dto.whatsappMobile);

    const { vibhag, jila, khand, mandal, gram } =
      await this.loadAndValidateHierarchyChain(dto);

    try {
      return await this.prisma.user.create({
        data: {
          fullName: dto.fullName,
          fatherName: dto.fatherName,
          whatsappMobile: dto.whatsappMobile,
          additionalMobile: dto.additionalMobile,
          fullAddress: dto.fullAddress,
          postalGram: dto.postalGram,
          post: dto.post,
          tehsil: dto.tehsil,
          pincode: dto.pincode,

          vibhagId: vibhag.id,
          jilaId: jila.id,
          khandId: khand.id,
          mandalId: mandal.id,
          gramId: gram.id,

          registrarName: dto.registrarName,
          registrarMobile: dto.registrarMobile,
          registeredById,

          status: UserStatus.Active,
        },
      });
    } catch (error) {
      this.handleUserPersistenceError(error);
    }
  }

  async getUserById(id: number): Promise<UserWithSubscriptionSummary> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return this.formatUser(user);
  }

  async findAllUsers(
    query: GetUsersRequestDto,
  ): Promise<PaginatedResult<UserWithSubscriptionSummary>> {
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      ...(query.status && { status: query.status }),
      ...(query.vibhagId && { vibhagId: query.vibhagId }),
      ...(query.jilaId && { jilaId: query.jilaId }),
      ...(query.khandId && { khandId: query.khandId }),
      ...(query.mandalId && { mandalId: query.mandalId }),
      ...(query.gramId && { gramId: query.gramId }),
      ...(query.registeredById && { registeredById: query.registeredById }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { fatherName: { contains: search, mode: 'insensitive' } },
          { whatsappMobile: { contains: search } },
          { registrarName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const [count, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: USER_INCLUDE,
      }),
    ]);

    const data = users.map((u) => this.formatUser(u));

    return { count, skip, take, data };
  }

  async updateUser(id: number, dto: UpdateUserRequestDto): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const whatsappMobile = dto.whatsappMobile ?? existingUser.whatsappMobile;

    const additionalMobile =
      dto.additionalMobile !== undefined
        ? dto.additionalMobile
        : existingUser.additionalMobile;

    await this.assertMobileNumbersAreDistinct({
      whatsappMobile,
      additionalMobile,
    });

    if (
      dto.whatsappMobile &&
      dto.whatsappMobile !== existingUser.whatsappMobile
    ) {
      await this.assertWhatsappMobileIsAvailable(dto.whatsappMobile, id);
    }

    const hierarchyChanged = this.hasHierarchyChanges(dto);

    let hierarchyData: {
      vibhagId: number;
      jilaId: number;
      khandId: number;
      mandalId: number;
      gramId: number;
    } | null = null;

    if (hierarchyChanged) {
      const hierarchy = await this.loadAndValidateHierarchyChain({
        vibhagId: dto.vibhagId ?? existingUser.vibhagId,
        jilaId: dto.jilaId ?? existingUser.jilaId,
        khandId: dto.khandId ?? existingUser.khandId,
        mandalId: dto.mandalId ?? existingUser.mandalId,
        gramId: dto.gramId ?? existingUser.gramId,
      });

      hierarchyData = {
        vibhagId: hierarchy.vibhag.id,
        jilaId: hierarchy.jila.id,
        khandId: hierarchy.khand.id,
        mandalId: hierarchy.mandal.id,
        gramId: hierarchy.gram.id,
      };
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined && {
            fullName: dto.fullName,
          }),

          ...(dto.fatherName !== undefined && {
            fatherName: dto.fatherName,
          }),

          ...(dto.whatsappMobile !== undefined && {
            whatsappMobile: dto.whatsappMobile,
          }),

          ...(dto.additionalMobile !== undefined && {
            additionalMobile: dto.additionalMobile,
          }),

          ...(dto.fullAddress !== undefined && {
            fullAddress: dto.fullAddress,
          }),

          ...(dto.postalGram !== undefined && {
            postalGram: dto.postalGram,
          }),

          ...(dto.post !== undefined && {
            post: dto.post,
          }),

          ...(dto.tehsil !== undefined && {
            tehsil: dto.tehsil,
          }),

          ...(dto.pincode !== undefined && {
            pincode: dto.pincode,
          }),

          ...(dto.registrarName !== undefined && {
            registrarName: dto.registrarName,
          }),

          ...(dto.registrarMobile !== undefined && {
            registrarMobile: dto.registrarMobile,
          }),

          ...(hierarchyData ?? {}),
        },
      });
    } catch (error) {
      this.handleUserPersistenceError(error);
    }
  }

  async updateUserStatus(id: number, status: UserStatus): Promise<User> {
    await this.getUserById(id);

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          status,
        },
      });
    } catch (error) {
      this.handleUserPersistenceError(error);
    }
  }

  async deleteUser(id: number): Promise<void> {
    await this.getUserById(id);

    try {
      await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'User cannot be deleted because it is referenced by other records',
        );
      }

      throw error;
    }
  }
}
