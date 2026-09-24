import { join } from 'node:path';
import { Cache } from 'cache-manager';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  StorageService,
  UserType,
  UtilsService,
  ValidatedUser,
  getAccessGuardCacheKey,
  getPrivilegeGuardCacheKey,
} from '@Common';
import { userConfigFactory } from '@Config';
import { PrismaService } from '../prisma';
import { OtpService } from '../otp';
import {
  HierarchyLevel,
  HierarchyNode,
  HierarchyStatus,
  Prisma,
  Privilege,
  RoleStatus,
  User,
  UserStatus,
} from '../generated/prisma/client';
import { CreateUserRequestDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(userConfigFactory.KEY)
    private readonly config: ConfigType<typeof userConfigFactory>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly storageService: StorageService,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Registers a new user against the organization hierarchy.
   *
   * TODO: registeredById is hardcoded to a static admin id in the controller
   * for now — swap back to the authenticated admin once auth is wired up.
   */

  private async loadAndValidateHierarchyChain(
    dto: CreateUserRequestDto,
  ): Promise<{
    vibhag: HierarchyNode;
    jila: HierarchyNode;
    khand: HierarchyNode;
    mandal: HierarchyNode;
    gram: HierarchyNode;
  }> {
    const [vibhag, jila, khand, mandal, gram] = await Promise.all([
      this.prisma.hierarchyNode.findUnique({ where: { id: dto.vibhagId } }),
      this.prisma.hierarchyNode.findUnique({ where: { id: dto.jilaId } }),
      this.prisma.hierarchyNode.findUnique({ where: { id: dto.khandId } }),
      this.prisma.hierarchyNode.findUnique({ where: { id: dto.mandalId } }),
      this.prisma.hierarchyNode.findUnique({ where: { id: dto.gramId } }),
    ]);

    this.assertValidNode(vibhag, HierarchyLevel.Vibhag, 'vibhagId');
    this.assertValidNode(jila, HierarchyLevel.Jila, 'jilaId');
    this.assertValidNode(khand, HierarchyLevel.Khand, 'khandId');
    this.assertValidNode(mandal, HierarchyLevel.Mandal, 'mandalId');
    this.assertValidNode(gram, HierarchyLevel.Gram, 'gramId');

    if (jila.parentId !== vibhag.id) {
      throw new BadRequestException(
        'jilaId does not belong to the given vibhagId',
      );
    }
    if (khand.parentId !== jila.id) {
      throw new BadRequestException(
        'khandId does not belong to the given jilaId',
      );
    }
    if (mandal.parentId !== khand.id) {
      throw new BadRequestException(
        'mandalId does not belong to the given khandId',
      );
    }
    if (gram.parentId !== mandal.id) {
      throw new BadRequestException(
        'gramId does not belong to the given mandalId',
      );
    }

    return { vibhag, jila, khand, mandal, gram };
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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A user with this WhatsApp number is already registered',
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException(
          'One of the provided hierarchy ids no longer exists',
        );
      }
      throw error;
    }
  }

  private async assertWhatsappMobileIsAvailable(
    whatsappMobile: string,
  ): Promise<void> {
    const existing = await this.prisma.user.findUnique({
      where: { whatsappMobile },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'A user with this WhatsApp number is already registered',
      );
    }
  }

  private async assertMobileNumbersAreDistinct(
    dto: CreateUserRequestDto,
  ): Promise<void> {
    if (dto.additionalMobile && dto.additionalMobile === dto.whatsappMobile) {
      throw new BadRequestException(
        'additionalMobile must be different from whatsappMobile',
      );
    }
  }
}
