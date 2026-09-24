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
import { adminConfigFactory } from '@Config';
import {
  StorageService,
  UtilsService,
  ValidatedUser,
  UserType,
  getAccessGuardCacheKey,
} from '@Common';
import { PrismaService } from '../prisma';
import { Admin, AdminMeta, Prisma } from '../generated/prisma/client';
import {
  AdminStatus,
  HierarchyStatus,
  RoleStatus,
} from '../generated/prisma/enums';
import { AuthService } from 'src/auth';
import {
  CreateAdminAssignmentDto,
  CreateAdminRequestDto,
  GetAdminUsersRequestDto,
  UpdateAdminUserRequestDto,
} from './dto';
import { ADMIN_ROLE_NAME } from 'src/roles/privilege-catalog.constant';

const ADMIN_USER_INCLUDE: Prisma.AdminInclude = {
  role: true,
  designationAssignments: {
    include: {
      node: true,
      designation: true,
      reportingTo: {
        select: {
          id: true,
          firstname: true,
          lastname: true,
          email: true,
          mobile: true,
          profileImage: true,
        },
      },
    },
    orderBy: [{ isActive: 'desc' }, { assignedAt: 'desc' }],
  },
};

@Injectable()
export class AdminService {
  constructor(
    @Inject(adminConfigFactory.KEY)
    private readonly config: ConfigType<typeof adminConfigFactory>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly storageService: StorageService,
  ) {}

  async validateAssignmentRefs(assignments: CreateAdminAssignmentDto[]) {
    if (assignments.length === 0) return;

    const pointIds = [...new Set(assignments.map((a) => a.pointId))];
    const designationIds = [
      ...new Set(assignments.map((a) => a.designationId)),
    ];
    const reportingIds = [
      ...new Set(
        assignments
          .map((a) => a.reportingId)
          .filter((id): id is number => id != null),
      ),
    ];

    const [points, designations, reportingAdmins] = await Promise.all([
      this.prisma.hierarchyNode.findMany({
        where: { id: { in: pointIds } },
        select: { id: true, status: true },
      }),
      this.prisma.hierarchyDesignation.findMany({
        where: { id: { in: designationIds } },
        select: { id: true, status: true },
      }),
      reportingIds.length
        ? this.prisma.admin.findMany({
            where: { id: { in: reportingIds } },
            select: { id: true, status: true },
          })
        : Promise.resolve([]),
    ]);

    const pointMap = new Map(points.map((p) => [p.id, p.status]));
    const designationMap = new Map(designations.map((d) => [d.id, d.status]));
    const reportingMap = new Map(reportingAdmins.map((r) => [r.id, r.status]));

    const errors: string[] = [];

    for (const [index, a] of assignments.entries()) {
      const pointStatus = pointMap.get(a.pointId);
      if (pointStatus === undefined) {
        errors.push(`Row ${index + 1}: pointId ${a.pointId} does not exist`);
      } else if (pointStatus !== 'Active') {
        errors.push(`Row ${index + 1}: pointId ${a.pointId} is not active`);
      }

      const designationStatus = designationMap.get(a.designationId);
      if (designationStatus === undefined) {
        errors.push(
          `Row ${index + 1}: designationId ${a.designationId} does not exist`,
        );
      } else if (designationStatus !== 'Active') {
        errors.push(
          `Row ${index + 1}: designationId ${a.designationId} is not active`,
        );
      }

      if (a.reportingId != null) {
        const reportingStatus = reportingMap.get(a.reportingId);
        if (reportingStatus === undefined) {
          errors.push(
            `Row ${index + 1}: reportingId ${a.reportingId} does not exist`,
          );
        } else if (reportingStatus !== 'Active') {
          errors.push(
            `Row ${index + 1}: reportingId ${a.reportingId} is not active`,
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

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

  async isEmailExist(email: string, excludeAdminId?: number): Promise<boolean> {
    return (
      (await this.prisma.admin.count({
        where: {
          email: email.toLowerCase(),
          NOT: {
            id: excludeAdminId,
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
      (await this.prisma.admin.count({
        where: {
          mobile,
          NOT: {
            id: excludeUserId,
          },
        },
      })) !== 0
    );
  }

  async getById(adminId: number): Promise<Admin> {
    return await this.prisma.admin.findUniqueOrThrow({
      where: {
        id: adminId,
      },
    });
  }

  async getByEmail(email: string): Promise<Admin | null> {
    return await this.prisma.admin.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
  }

  async getMetaById(adminId: number): Promise<AdminMeta> {
    return await this.prisma.adminMeta.findUniqueOrThrow({
      where: {
        adminId,
      },
    });
  }

  async authenticate(adminId: number, password: string): Promise<Admin> {
    const admin = await this.getById(adminId);
    const validation = await this.validateCredentials(admin.email, password);

    if (validation === null) throw new Error('Admin not found');
    if (validation === false) throw new Error('Incorrect password');

    return admin;
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<ValidatedUser | false | null> {
    const admin = await this.getByEmail(email);
    if (!admin) return null;
    if (admin.status !== AdminStatus.Active) {
      throw new Error(
        'Your account has been temporarily suspended/blocked by the system',
      );
    }

    const adminMeta = await this.getMetaById(admin.id);
    const passwordHash = this.utilsService.hashPassword(
      password,
      adminMeta.passwordSalt || '',
      adminMeta.passwordHash
        ? adminMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );

    if (adminMeta.passwordHash === passwordHash) {
      const assignedRole = await this.prisma.admin.findFirst({
        where: { id: admin.id },
        select: {
          role: {
            select: { name: true },
          },
        },
      });

      const roleName = assignedRole?.role.name ?? null;
      const userRoles = await this.prisma.admin.findMany({
        where: { id: admin.id },
        include: {
          role: {
            include: {
              privileges: {
                include: {
                  privilege: {
                    select: {
                      id: true,
                      key: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      const rolesPrivileges = userRoles.flatMap((ur) =>
        ur.role.privileges.map((rp) => rp.privilege.key),
      );
      return {
        id: admin.id,
        type: UserType.Admin,
        role: roleName || 'member',
        assignedPrivileges: rolesPrivileges || [''],
      };
    }

    return false;
  }

  async getProfile(adminId: number) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      include: ADMIN_USER_INCLUDE,
    });

    if (!admin) {
      throw new NotFoundException(`User with ID ${adminId} not found`);
    }

    return this.formatAdminUser(admin);
  }

  async updateProfileDetails(
    adminId: number,
    data: {
      firstname?: string;
      lastname?: string;
      email?: string;
    },
    options?: { tx?: Prisma.TransactionClient },
  ): Promise<Admin> {
    const prismaClient = options?.tx ? options.tx : this.prisma;

    const admin = await prismaClient.admin.findUniqueOrThrow({
      where: { id: adminId },
    });
    if (data.email && (await this.isEmailExist(data.email, adminId))) {
      throw new Error('Email already exist');
    }

    return await prismaClient.admin.update({
      data: {
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email && data.email.toLowerCase(),
      },
      where: {
        id: admin.id,
      },
    });
  }

  async updateProfileImage(
    adminId: number,
    profileImage: string,
  ): Promise<{ profileImage: string | null }> {
    const admin = await this.getById(adminId);

    return await this.prisma.$transaction(async (tx) => {
      await tx.admin.update({
        where: { id: adminId },
        data: { profileImage },
      });

      // Remove previous profile image from storage
      if (admin.profileImage) {
        await this.storageService.removeFile(
          join(this.config.profileImagePath, admin.profileImage),
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
    adminId: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<Admin> {
    if (oldPassword === newPassword) {
      throw new BadRequestException(
        'New password must be different from the old password',
      );
    }

    const admin = await this.getById(adminId);
    const adminMeta = await this.getMetaById(admin.id);

    const hashedPassword = this.utilsService.hashPassword(
      oldPassword,
      adminMeta.passwordSalt || '',
      adminMeta.passwordHash
        ? adminMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );

    if (hashedPassword !== adminMeta.passwordHash)
      throw new Error('Password does not match');

    const { salt, hash } = this.hashPassword(newPassword);
    const passwordSalt = salt;
    const passwordHash = hash;

    await this.prisma.adminMeta.update({
      data: {
        passwordHash,
        passwordSalt,
      },
      where: {
        adminId,
      },
    });
    return admin;
  }

  async create(data: CreateAdminRequestDto): Promise<Admin> {
    if (await this.isEmailExist(data.email)) {
      throw new Error('Email already exist');
    }
    if (data.mobile && (await this.isMobileExist(data.mobile))) {
      throw new Error('Mobile already exist');
    }

    if (data.roleId) {
      const result = await this.prisma.role.findFirst({
        where: { id: data.roleId, status: RoleStatus.Active },
      });
      if (!result) {
        throw new Error(
          'Assigned Role is not longer Active, Please refresh the roles section and try again',
        );
      }
    }

    this.validateAssignmentRefs(data.assignments);

    let passwordSalt = null;
    let passwordHash = null;
    if (data.password) {
      const { salt, hash } = this.hashPassword(data.password);
      passwordSalt = salt;
      passwordHash = hash;
    }

    const adminUser = await this.prisma.admin.create({
      data: {
        firstname: data.firstname,
        lastname: (data.lastname || '').trim(),
        email: data.email.toLowerCase(),
        mobile: data.mobile,
        status: AdminStatus.Active,
        roleId: data.roleId,
        meta: {
          create: {
            passwordHash,
            passwordSalt,
          },
        },
      },
    });

    if (data.assignments && data.assignments.length > 0) {
      await Promise.all(
        data.assignments.map((assignment) =>
          this.prisma.userHierarchyDesignation.create({
            data: {
              userId: adminUser.id,
              nodeId: assignment.pointId,
              designationId: assignment.designationId,
              reportingId: assignment.reportingId,
            },
          }),
        ),
      );
    }

    return adminUser;
  }

  private formatAdminUser(user: any) {
    return {
      ...user,
      profileImage: user.profileImage
        ? this.getProfileImageUrl(user.profileImage)
        : null,
      designationAssignments: (user.designationAssignments || []).map(
        (assignment: any) => ({
          ...assignment,
          reportingTo: assignment.reportingTo
            ? {
                ...assignment.reportingTo,
                profileImage: assignment.reportingTo.profileImage
                  ? this.getProfileImageUrl(assignment.reportingTo.profileImage)
                  : null,
              }
            : null,
        }),
      ),
    };
  }

  async findAllUsers(query: GetAdminUsersRequestDto) {
    const search = query.search?.trim();
    const where: Prisma.AdminWhereInput = {
      ...(query.roleId && { roleId: query.roleId }),
      ...(query.status && { status: query.status }),
      ...((query.pointId || query.designationId) && {
        designationAssignments: {
          some: {
            isActive: true,
            ...(query.pointId && { nodeId: query.pointId }),
            ...(query.designationId && { designationId: query.designationId }),
          },
        },
      }),
      ...(search && {
        OR: [
          { firstname: { contains: search, mode: 'insensitive' } },
          { lastname: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search } },
        ],
      }),
    };

    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const [count, users] = await Promise.all([
      this.prisma.admin.count({ where }),
      this.prisma.admin.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: ADMIN_USER_INCLUDE,
      }),
    ]);

    const data = users.map((u) => this.formatAdminUser(u));

    return { count, skip, take, data };
  }

  async findUserById(id: number) {
    const user = await this.prisma.admin.findUnique({
      where: { id },
      include: ADMIN_USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.formatAdminUser(user);
  }

  async setStatus(userId: number, status: AdminStatus): Promise<Admin> {
    const admin = await this.prisma.admin.findUnique({
      where: { id: userId },
    });

    if (!admin) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    await this.cacheManager.del(
      getAccessGuardCacheKey({ id: userId, type: UserType.Admin }),
    );
    return await this.prisma.admin.update({
      data: { status },
      where: {
        id: userId,
      },
    });
  }

  private async isEligibleReportingAuthority(
    nodeId: number,
    reportingUserId: number,
  ): Promise<boolean> {
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

  async updateUser(userId: number, data: UpdateAdminUserRequestDto) {
    const user = await this.prisma.admin.findUnique({
      where: { id: userId },
      include: {
        designationAssignments: {
          where: { isActive: true },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (data.email) {
      const email = data.email.trim().toLowerCase();
      if (await this.isEmailExist(email, userId)) {
        throw new BadRequestException('Email already exist');
      }
    }

    if (data.mobile) {
      const mobile = data.mobile.trim();
      if (await this.isMobileExist(mobile, userId)) {
        throw new BadRequestException('Mobile already exist');
      }
    }

    if (data.roleId !== undefined) {
      const role = await this.prisma.role.findUnique({
        where: { id: data.roleId },
      });
      if (!role) {
        throw new NotFoundException(`Role with ID ${data.roleId} not found`);
      }
      if (role.status !== RoleStatus.Active) {
        throw new BadRequestException(
          'Assigned Role is no longer Active, please select an active role',
        );
      }
    }

    let targetAssignments: Array<{
      pointId: number;
      designationId: number;
      reportingId?: number | null;
    }> | null = null;

    if (data.assignments !== undefined) {
      targetAssignments = data.assignments;
    } else if (
      data.pointId !== undefined ||
      data.designationId !== undefined ||
      data.reportingId !== undefined
    ) {
      const currentActive = user.designationAssignments[0];
      const pointId = data.pointId ?? currentActive?.nodeId;
      const designationId = data.designationId ?? currentActive?.designationId;
      const reportingId =
        data.reportingId !== undefined
          ? data.reportingId
          : (currentActive?.reportingId ?? null);

      if (!pointId || !designationId) {
        throw new BadRequestException(
          'Both Hierarchy Point (pointId) and Designation (designationId) are required to assign a responsibility',
        );
      }

      targetAssignments = [{ pointId, designationId, reportingId }];
    }

    if (targetAssignments !== null && targetAssignments.length > 0) {
      for (const [index, assignment] of targetAssignments.entries()) {
        const prefix =
          targetAssignments.length > 1 ? `Assignment ${index + 1}: ` : '';

        // 1. Validate Point (HierarchyNode)
        const node = await this.prisma.hierarchyNode.findUnique({
          where: { id: assignment.pointId },
        });
        if (!node) {
          throw new NotFoundException(
            `${prefix}Hierarchy node (Point) with ID ${assignment.pointId} not found`,
          );
        }
        if (node.status !== HierarchyStatus.Active) {
          throw new BadRequestException(
            `${prefix}Hierarchy node '${node.name}' is not active`,
          );
        }

        // 2. Validate Designation
        const designation = await this.prisma.hierarchyDesignation.findUnique({
          where: { id: assignment.designationId },
        });
        if (!designation) {
          throw new NotFoundException(
            `${prefix}Designation with ID ${assignment.designationId} not found`,
          );
        }
        if (designation.status !== HierarchyStatus.Active) {
          throw new BadRequestException(
            `${prefix}Designation '${designation.name}' is not active`,
          );
        }

        // 3. Level Validation
        if (designation.level !== node.level) {
          throw new BadRequestException(
            `${prefix}Level mismatch: Designation '${designation.name}' is for level '${designation.level}', but Hierarchy Node '${node.name}' is at level '${node.level}'. Levels must match.`,
          );
        }

        // 4. Validate Reporting Authority
        if (assignment.reportingId != null) {
          if (assignment.reportingId === userId) {
            throw new BadRequestException(
              `${prefix}A user cannot be their own reporting authority`,
            );
          }

          const reportingUser = await this.prisma.admin.findUnique({
            where: { id: assignment.reportingId },
            include: { role: true },
          });

          if (!reportingUser) {
            throw new NotFoundException(
              `${prefix}Reporting authority user with ID ${assignment.reportingId} not found`,
            );
          }

          if (reportingUser.status !== AdminStatus.Active) {
            throw new BadRequestException(
              `${prefix}Reporting authority user '${reportingUser.firstname} ${reportingUser.lastname}' is not active`,
            );
          }

          const eligible = await this.isEligibleReportingAuthority(
            node.id,
            assignment.reportingId,
          );
          if (!eligible && reportingUser.role?.name !== ADMIN_ROLE_NAME) {
            throw new BadRequestException(
              `${prefix}User '${reportingUser.firstname} ${reportingUser.lastname}' (ID: ${assignment.reportingId}) is not an eligible reporting authority for point '${node.name}'. Reporting authority must be assigned at the same point or in the upper hierarchy.`,
            );
          }
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.AdminUpdateInput = {};
      if (data.firstname !== undefined) {
        updateData.firstname = data.firstname.trim();
      }
      if (data.lastname !== undefined) {
        updateData.lastname = data.lastname.trim();
      }
      if (data.email !== undefined) {
        updateData.email = data.email.trim().toLowerCase();
      }
      if (data.mobile !== undefined) {
        updateData.mobile = data.mobile.trim();
      }
      if (data.roleId !== undefined) {
        updateData.role = { connect: { id: data.roleId } };
      }

      if (Object.keys(updateData).length > 0) {
        await tx.admin.update({
          where: { id: userId },
          data: updateData,
        });
      }

      if (targetAssignments !== null) {
        await tx.userHierarchyDesignation.updateMany({
          where: {
            userId,
            isActive: true,
          },
          data: {
            isActive: false,
            unassignedAt: new Date(),
          },
        });

        if (targetAssignments.length > 0) {
          for (const assignment of targetAssignments) {
            await tx.userHierarchyDesignation.create({
              data: {
                userId,
                nodeId: assignment.pointId,
                designationId: assignment.designationId,
                reportingId: assignment.reportingId ?? null,
                isActive: true,
                assignedAt: new Date(),
              },
            });
          }
        }
      }
    });

    return await this.findUserById(userId);
  }
}
