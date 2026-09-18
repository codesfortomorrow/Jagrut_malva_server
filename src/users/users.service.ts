import { join } from 'node:path';
import { Cache } from 'cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  AuthenticatedUser,
  StorageService,
  UserType,
  UtilsService,
  ValidatedUser,
  getAccessGuardCacheKey,
  getPrivilegeGuardCacheKey,
} from '@Common';
import { userConfigFactory } from '@Config';
import { PrismaService } from '../prisma';
import {
  OtpContext,
  OtpService,
  SendCodeResponse,
  VerifyCodeResponse,
} from '../otp';
import {
  HierarchyStatus,
  OtpTransport,
  Prisma,
  Privilege,
  RoleStatus,
  User,
  UserMeta,
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

  private getProfileImageUrl(profileImage: string): string {
    return this.storageService.getFileUrl(
      profileImage,
      this.config.profileImagePath,
    );
  }

  private hashPassword(password: string): { salt: string; hash: string } {
    const salt = this.utilsService.generateSalt(this.config.passwordSaltLength);
    const hash = this.utilsService.hashPassword(
      password,
      salt,
      this.config.passwordHashLength,
    );
    return { salt, hash };
  }

  private isValidUsername(username: string): boolean {
    return /^[a-z][a-z0-9_]{3,20}$/.test(username);
  }

  async isEmailExist(email: string, excludeUserId?: number): Promise<boolean> {
    return (
      (await this.prisma.user.count({
        where: {
          email: email.toLowerCase(),
          NOT: {
            id: excludeUserId,
          },
        },
      })) !== 0
    );
  }

  async isUsernameExist(
    username: string,
    excludeUserId?: number,
  ): Promise<boolean> {
    return (
      (await this.prisma.user.count({
        where: {
          username,
          NOT: {
            id: excludeUserId,
          },
        },
      })) !== 0
    );
  }

  async isMobileExist(
    mobile: string,
    excludeUserId?: number,
  ): Promise<boolean> {
    return (
      (await this.prisma.user.count({
        where: {
          mobile,
          NOT: {
            id: excludeUserId,
          },
        },
      })) !== 0
    );
  }

  async getById(userId: number): Promise<User> {
    return await this.prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
    });
  }

  async getByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
  }

  async getByMobile(mobile: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        mobile,
      },
    });
  }

  async getMetaById(userId: number): Promise<UserMeta> {
    return await this.prisma.userMeta.findUniqueOrThrow({
      where: {
        userId,
      },
    });
  }

  async getMetaByEmail(email: string): Promise<UserMeta> {
    return await this.prisma.userMeta.findFirstOrThrow({
      where: {
        user: {
          email: email.toLowerCase(),
        },
      },
    });
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<ValidatedUser | false | null> {
    const user = await this.getByEmail(email);
    if (!user) return null;
    if (user.status !== UserStatus.Active) {
      throw new Error(
        'Your account has been temporarily suspended/blocked by the system. Please contact customer support for assistance',
      );
    }

    const userMeta = await this.getMetaById(user.id);
    const passwordHash = this.utilsService.hashPassword(
      password,
      userMeta.passwordSalt || '',
      userMeta.passwordHash
        ? userMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );
    if (userMeta.passwordHash === passwordHash) {
      return {
        id: user.id,
        type: UserType.User,
      };
    }

    return false;
  }

  async create(data: {
    firstname: string;
    lastname: string;
    email: string;
    password?: string;
    dialCode?: string;
    mobile?: string;
    country?: string;
    googleId?: string;
    profileImage?: string;
  }): Promise<User> {
    if (await this.isEmailExist(data.email)) {
      throw new Error('Email already exist');
    }
    if (data.mobile && (await this.isMobileExist(data.mobile))) {
      throw new Error('Mobile already exist');
    }

    let passwordSalt = null;
    let passwordHash = null;
    if (data.password) {
      const { salt, hash } = this.hashPassword(data.password);
      passwordSalt = salt;
      passwordHash = hash;
    }

    return await this.prisma.user.create({
      data: {
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email.toLowerCase(),
        dialCode: data.dialCode,
        mobile: data.mobile,
        profileImage: data.profileImage,
        country: data.country,
        meta: {
          create: {
            passwordHash,
            passwordSalt,
            googleId: data.googleId,
          },
        },
      },
    });
  }

  private async isEligibleReportingAuthority(
    nodeId: number,
    reportingUserId: number,
  ): Promise<boolean> {
    // Collect all eligible node IDs: nodeId itself + all ancestors up to Prant (root)
    const eligibleNodeIds: number[] = [nodeId];
    let currentNode = await this.prisma.hierarchyNode.findUnique({
      where: { id: nodeId },
      select: { parentId: true },
    });

    while (currentNode && currentNode.parentId) {
      eligibleNodeIds.push(currentNode.parentId);
      currentNode = await this.prisma.hierarchyNode.findUnique({
        where: { id: currentNode.parentId },
        select: { parentId: true },
      });
    }

    // Check if reportingUserId has an active assignment in any of these eligibleNodeIds
    const activeAssignment =
      await this.prisma.userHierarchyDesignation.findFirst({
        where: {
          userId: reportingUserId,
          nodeId: { in: eligibleNodeIds },
          isActive: true,
        },
      });

    return !!activeAssignment;
  }

  async createUser(dto: CreateUserRequestDto) {
    const email = dto.email.trim().toLowerCase();
    const mobile = dto.mobile ? dto.mobile.trim() : null;

    if (await this.isEmailExist(email)) {
      throw new BadRequestException(`Email '${email}' is already registered`);
    }

    if (mobile && (await this.isMobileExist(mobile))) {
      throw new BadRequestException(`Mobile '${mobile}' is already registered`);
    }

    // 1. Validate Roles if provided
    const roleIds =
      dto.roleIds && dto.roleIds.length > 0
        ? Array.from(new Set(dto.roleIds))
        : [];
    if (roleIds.length > 0) {
      const foundRoles = await this.prisma.role.findMany({
        where: { id: { in: roleIds } },
      });
      if (foundRoles.length !== roleIds.length) {
        throw new BadRequestException(
          'One or more specified role IDs do not exist',
        );
      }
      for (const role of foundRoles) {
        if (role.status !== RoleStatus.Active) {
          throw new BadRequestException(`Role '${role.name}' is inactive`);
        }
      }
    }

    // 2. Validate Assignments if provided
    if (dto.assignments && dto.assignments.length > 0) {
      const assignmentPairs = new Set<string>();

      for (const a of dto.assignments) {
        // Prevent duplicate (pointId, designationId) in the same request
        const key = `${a.pointId}-${a.designationId}`;
        if (assignmentPairs.has(key)) {
          throw new BadRequestException(
            `Duplicate assignment for pointId ${a.pointId} and designationId ${a.designationId} in request`,
          );
        }
        assignmentPairs.add(key);

        // A. Validate Point (HierarchyNode)
        const node = await this.prisma.hierarchyNode.findUnique({
          where: { id: a.pointId },
        });
        if (!node) {
          throw new NotFoundException(
            `Hierarchy node (Point) with ID ${a.pointId} not found`,
          );
        }
        if (node.status !== HierarchyStatus.Active) {
          throw new BadRequestException(
            `Hierarchy node '${node.name}' is inactive`,
          );
        }

        // B. Validate Designation
        const designation = await this.prisma.hierarchyDesignation.findUnique({
          where: { id: a.designationId },
        });
        if (!designation) {
          throw new NotFoundException(
            `Designation with ID ${a.designationId} not found`,
          );
        }
        if (designation.status !== HierarchyStatus.Active) {
          throw new BadRequestException(
            `Designation '${designation.name}' is inactive`,
          );
        }
        if (designation.level !== node.level) {
          throw new BadRequestException(
            `Designation '${designation.name}' is at level '${designation.level}', but point '${node.name}' is at level '${node.level}'. Levels must match.`,
          );
        }

        // C. Validate Reporting Authority if provided
        if (a.reportingId) {
          const reportingUser = await this.prisma.user.findUnique({
            where: { id: a.reportingId },
          });
          if (!reportingUser) {
            throw new NotFoundException(
              `Reporting authority user with ID ${a.reportingId} not found`,
            );
          }
          if (reportingUser.status !== UserStatus.Active) {
            throw new BadRequestException(
              `Reporting authority user '${reportingUser.firstname} ${reportingUser.lastname}' is not active`,
            );
          }

          const eligible = await this.isEligibleReportingAuthority(
            a.pointId,
            a.reportingId,
          );
          if (!eligible) {
            throw new BadRequestException(
              `User '${reportingUser.firstname} ${reportingUser.lastname}' (ID: ${a.reportingId}) is not an eligible reporting authority for point '${node.name}'. Reporting authority must be assigned at the same point or in the upper hierarchy.`,
            );
          }
        }
      }
    }

    // 3. Atomic Transaction: User + UserMeta + Roles + Organizational Assignments
    const { salt, hash } = this.hashPassword(dto.password);

    const createdUserId = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstname: dto.firstname.trim(),
          lastname: (dto.lastname || '').trim(),
          email,
          mobile,
          dialCode: dto.dialCode || '+91',
          country: dto.country || 'IN',
          isVerified: true,
          status: UserStatus.Active,
          meta: {
            create: {
              passwordHash: hash,
              passwordSalt: salt,
            },
          },
        },
      });

      // Assign Roles
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({
            userId: user.id,
            roleId,
          })),
        });
      }

      // Assign Organizational Designations
      if (dto.assignments && dto.assignments.length > 0) {
        for (const a of dto.assignments) {
          await tx.userHierarchyDesignation.create({
            data: {
              userId: user.id,
              nodeId: a.pointId,
              designationId: a.designationId,
              reportingId: a.reportingId ?? null,
              isActive: true,
              assignedAt: new Date(),
            },
          });
        }
      }

      return user.id;
    });

    // Invalidate access / privilege caches
    await this.cacheManager.del(
      getAccessGuardCacheKey({ id: createdUserId, type: UserType.User }),
    );
    await this.cacheManager.del(
      getPrivilegeGuardCacheKey({ id: createdUserId, type: UserType.User }),
    );

    // Return full onboarded user details
    return await this.prisma.user.findUnique({
      where: { id: createdUserId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
        designationAssignments: {
          where: { isActive: true },
          include: {
            node: true,
            designation: true,
            reportingTo: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async getOrCreateByGoogle(data: {
    googleId: string;
    email: string;
    firstname?: string;
    lastname?: string;
    profileImage?: string;
  }): Promise<ValidatedUser> {
    let user = await this.prisma.user.findFirst({
      where: {
        meta: {
          googleId: data.googleId,
        },
      },
    });
    if (!user) {
      const isEmailExist = await this.isEmailExist(data.email);
      if (isEmailExist) {
        user = await this.prisma.user.update({
          data: {
            meta: {
              update: {
                googleId: data.googleId,
              },
            },
          },
          where: { email: data.email.toLowerCase() },
        });
      } else {
        user = await this.create({
          firstname: data.firstname || '',
          lastname: data.lastname || '',
          email: data.email,
          profileImage: data.profileImage,
          googleId: data.googleId,
        });
      }
    }

    return {
      id: user.id,
      type: UserType.User,
    };
  }

  async getProfile(userId: number): Promise<User> {
    const user = await this.getById(userId);
    if (user.profileImage) {
      user.profileImage = this.getProfileImageUrl(user.profileImage);
    }
    return user;
  }

  async updateProfileDetails(
    data: {
      userId: number;
      username?: string;
      firstname?: string;
      lastname?: string;
      email?: string;
      dialCode?: string;
      mobile?: string;
      country?: string;
    },
    options?: { tx?: Prisma.TransactionClient },
  ): Promise<User> {
    const prismaClient = options?.tx ? options.tx : this.prisma;

    if (data.email && (await this.isEmailExist(data.email, data.userId))) {
      throw new Error('Email already exist');
    }
    if (data.username && !this.isValidUsername(data.username)) {
      throw new Error('Invalid username');
    }
    if (
      data.username &&
      (await this.isUsernameExist(data.username, data.userId))
    ) {
      throw new Error('Username already exist');
    }
    if (data.mobile && (await this.isMobileExist(data.mobile, data.userId))) {
      throw new Error('Mobile already exist');
    }

    return await prismaClient.user.update({
      data: {
        username: data.username && data.username.toLowerCase(),
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email && data.email.toLowerCase(),
        dialCode: data.dialCode,
        mobile: data.mobile,
        country: data.country,
      },
      where: {
        id: data.userId,
      },
    });
  }

  async updateProfileDetailsByAdministrator(data: {
    userId: number;
    username?: string;
    firstname?: string;
    lastname?: string;
    email?: string;
    dialCode?: string;
    mobile?: string;
    country?: string;
    password?: string;
  }) {
    await this.prisma.$transaction(async (tx) => {
      const user = await this.updateProfileDetails(
        {
          userId: data.userId,
          username: data.username,
          firstname: data.firstname,
          lastname: data.lastname,
          email: data.email,
          dialCode: data.dialCode,
          mobile: data.mobile,
          country: data.country,
        },
        { tx },
      );

      if (data.password) {
        const { salt, hash } = this.hashPassword(data.password);
        const passwordSalt = salt;
        const passwordHash = hash;

        await tx.userMeta.update({
          data: {
            passwordHash,
            passwordSalt,
          },
          where: {
            userId: data.userId,
          },
        });
      }

      return user;
    });
  }

  async updateProfileImage(
    userId: number,
    profileImage: string,
  ): Promise<{ profileImage: string | null }> {
    const user = await this.getById(userId);

    return await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { profileImage },
      });

      if (user.profileImage) {
        // Remove previous profile image from storage
        await this.storageService.removeFile(
          join(this.config.profileImagePath, user.profileImage),
        );
      }
      await this.storageService.move(
        profileImage,
        this.config.profileImagePath,
      );

      return {
        profileImage: this.getProfileImageUrl(profileImage),
      };
    });
  }

  async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<User> {
    if (oldPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from the old password',
      );
    }

    const user = await this.getById(userId);
    const userMeta = await this.getMetaById(user.id);

    const hashedPassword = this.utilsService.hashPassword(
      oldPassword,
      userMeta.passwordSalt || '',
      userMeta.passwordHash
        ? userMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );

    if (hashedPassword !== userMeta.passwordHash)
      throw new Error('Password does not match');

    const { salt, hash } = this.hashPassword(newPassword);
    const passwordSalt = salt;
    const passwordHash = hash;

    await this.prisma.userMeta.update({
      data: {
        passwordHash,
        passwordSalt,
      },
      where: {
        userId,
      },
    });
    return user;
  }

  async sendResetPasswordVerificationCode(email?: string, mobile?: string) {
    let user: User | null | undefined;

    if (email) user = await this.getByEmail(email);
    if (!user && mobile) user = await this.getByMobile(mobile);
    if (!user) throw new Error('User does not exist');

    const response: { email?: SendCodeResponse; mobile?: SendCodeResponse } =
      {};

    if (mobile) {
      response.mobile = await this.otpService.send({
        context: OtpContext.ResetPassword,
        target: mobile,
        transport: OtpTransport.Mobile,
      });
    }
    if (email) {
      response.email = await this.otpService.send({
        context: OtpContext.ResetPassword,
        target: email,
        transport: OtpTransport.Email,
        transportParams: {
          username: user.firstname.concat(' ', user.lastname),
        },
      });
    }

    return response;
  }

  async resetPassword(
    code: string,
    newPassword: string,
    mobile?: string,
    email?: string,
  ): Promise<User> {
    // Get user
    let user: User | null | undefined;
    if (email) {
      user = await this.getByEmail(email);
    }
    if (!user && mobile) {
      user = await this.getByMobile(mobile);
    }
    if (!user) throw new Error('User not found');

    // Validate code
    let response: VerifyCodeResponse | null | undefined;

    if (mobile)
      response = await this.otpService.verify(
        code,
        mobile,
        OtpTransport.Mobile,
      );
    if (email)
      response = await this.otpService.verify(code, email, OtpTransport.Email);
    if (!response) throw new Error('Invalid email or mobile');
    if (response.status === false)
      throw new Error('Incorrect verification code');

    // Reset password
    const { salt: passwordSalt, hash: passwordHash } =
      this.hashPassword(newPassword);

    await this.prisma.userMeta.update({
      data: {
        passwordSalt,
        passwordHash,
      },
      where: { userId: user.id },
    });
    return user;
  }

  async setStatus(userId: number, status: UserStatus): Promise<User> {
    await this.cacheManager.del(
      getAccessGuardCacheKey({ id: userId, type: UserType.User }),
    );
    return await this.prisma.user.update({
      data: { status },
      where: {
        id: userId,
      },
    });
  }

  async getAll(options?: {
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<{
    count: number;
    skip: number;
    take: number;
    data: User[];
  }> {
    const search = options?.search?.trim();
    const pagination = { skip: options?.skip || 0, take: options?.take || 10 };
    const where: Prisma.UserWhereInput = {};
    if (search) {
      const buildSearchFilter = (search: string): Prisma.UserWhereInput[] => [
        {
          firstname: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          lastname: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          username: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          mobile: {
            contains: search,
            mode: 'insensitive',
          },
        },
      ];
      const parts = search.split(' ');
      if (parts.length !== 0) {
        where.AND = [];
        for (const part of parts) {
          if (part.trim()) {
            where.AND.push({
              OR: buildSearchFilter(part.trim()),
            });
          }
        }
      }
    }

    const totalUsers = await this.prisma.user.count({
      where,
    });
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { id: Prisma.SortOrder.asc },
      skip: pagination.skip,
      take: pagination.take,
    });
    const response = await this.utilsService.batchable(users, async (user) => {
      return {
        ...user,
        profileImage: user.profileImage
          ? this.getProfileImageUrl(user.profileImage)
          : null,
      };
    });

    return {
      count: totalUsers,
      skip: pagination.skip,
      take: pagination.take,
      data: response,
    };
  }

  // GET ALL ROLES ASSIGNED TO A USER
  async getUserRoles(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
      orderBy: {
        roleId: 'asc',
      },
    });

    return {
      userId: user.id,
      userName: `${user.firstname} ${user.lastname}`.trim(),
      roles: userRoles.map((ur) => ({
        ...ur.role,
        assignedAt: ur.assignedAt,
      })),
      total: userRoles.length,
    };
  }

  // ASSIGN A ROLE TO A USER
  async assignRole(userId: number, roleId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const existing = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Role '${role.name}' is already assigned to user with ID ${userId}`,
      );
    }

    const userRole = await this.prisma.userRole.create({
      data: {
        userId,
        roleId,
      },
      include: {
        role: true,
      },
    });

    // Invalidate cached privileges so new permissions take effect immediately
    await this.cacheManager.del(
      getPrivilegeGuardCacheKey({ id: userId, type: UserType.User }),
    );

    return {
      message: `Role '${role.name}' assigned to user successfully`,
      userRole: {
        userId: userRole.userId,
        roleId: userRole.roleId,
        role: userRole.role,
        assignedAt: userRole.assignedAt,
      },
    };
  }

  // REMOVE A ROLE FROM A USER
  async removeRole(userId: number, roleId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    const userRole = await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    if (!userRole) {
      throw new NotFoundException(
        `Role with ID ${roleId} is not assigned to user with ID ${userId}`,
      );
    }

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

    // Invalidate cached privileges so removal takes effect immediately
    await this.cacheManager.del(
      getPrivilegeGuardCacheKey({ id: userId, type: UserType.User }),
    );

    return {
      message: `Role '${role.name}' removed from user successfully`,
    };
  }

  // GET EFFECTIVE PRIVILEGES OF A USER (UNION OF ALL ASSIGNED ROLES' PRIVILEGES)
  async getEffectivePrivileges(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            privileges: {
              include: {
                privilege: true,
              },
            },
          },
        },
      },
      orderBy: {
        roleId: 'asc',
      },
    });

    const privilegeMap = new Map<number, Privilege>();
    const assignedRoles = userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
    }));

    for (const ur of userRoles) {
      for (const rp of ur.role.privileges) {
        if (!privilegeMap.has(rp.privilege.id)) {
          privilegeMap.set(rp.privilege.id, rp.privilege);
        }
      }
    }

    const effectivePrivileges = Array.from(privilegeMap.values()).sort(
      (a, b) => a.id - b.id,
    );

    return {
      userId: user.id,
      userName: `${user.firstname} ${user.lastname}`.trim(),
      roles: assignedRoles,
      privileges: effectivePrivileges,
      total: effectivePrivileges.length,
    };
  }

  async getMyPrivileges(authUser: AuthenticatedUser) {
    if (authUser.type === UserType.Admin) {
      const allPrivileges = await this.prisma.privilege.findMany({
        orderBy: { id: 'asc' },
      });
      return {
        userId: authUser.id,
        userName: 'Administrator',
        roles: [{ id: 0, name: 'Super Administrator' }],
        privileges: allPrivileges,
        total: allPrivileges.length,
      };
    }

    return await this.getEffectivePrivileges(authUser.id);
  }
}
