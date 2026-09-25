import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, UtilsService } from '@Common';
import { adminConfigFactory } from '@Config';
import {
  AdminStatus,
  HierarchyLevel,
  HierarchyStatus,
  RoleStatus,
} from '../generated/prisma/client';

describe('AdminService - updateUser', () => {
  let service: AdminService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      admin: {
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      role: {
        findFirst: jest.fn(),
      },
      hierarchyNode: {
        findUnique: jest.fn(),
      },
      hierarchyDesignation: {
        findUnique: jest.fn(),
      },
      userHierarchyDesignation: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) =>
        cb(prismaMock),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: adminConfigFactory.KEY,
          useValue: { profileImagePath: 'profiles', passwordHashLength: 32 },
        },
        {
          provide: CACHE_MANAGER,
          useValue: { del: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: UtilsService,
          useValue: { hashPassword: jest.fn() },
        },
        {
          provide: StorageService,
          useValue: {
            getFileUrl: jest.fn(),
            removeFile: jest.fn(),
            move: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should throw NotFoundException if admin user does not exist', async () => {
    prismaMock.admin.findUnique.mockResolvedValue(null);

    await expect(
      service.updateUser(999, { firstname: 'John' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if level mismatch between designation and point', async () => {
    prismaMock.admin.findUnique.mockResolvedValue({
      id: 1,
      designationAssignments: [],
    });
    prismaMock.admin.count.mockResolvedValue(0);

    prismaMock.hierarchyNode.findUnique.mockResolvedValue({
      id: 5,
      name: 'Indore Jila',
      level: HierarchyLevel.Jila,
      status: HierarchyStatus.Active,
    });

    prismaMock.hierarchyDesignation.findUnique.mockResolvedValue({
      id: 2,
      name: 'Prant Pramukh',
      level: HierarchyLevel.Prant,
      status: HierarchyStatus.Active,
    });

    await expect(
      service.updateUser(1, {
        assignments: [{ pointId: 5, designationId: 2 }],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully update profile fields and assignments', async () => {
    const existingUser = {
      id: 1,
      firstname: 'Old',
      lastname: 'Name',
      email: 'old@example.com',
      mobile: '9876543210',
      role: { id: 2, name: 'Coordinator' },
      designationAssignments: [],
    };

    prismaMock.admin.findUnique.mockResolvedValue(existingUser);
    prismaMock.admin.count.mockResolvedValue(0);
    prismaMock.role.findFirst.mockResolvedValue({
      id: 2,
      status: RoleStatus.Active,
    });

    prismaMock.hierarchyNode.findUnique.mockResolvedValue({
      id: 5,
      name: 'Indore Jila',
      level: HierarchyLevel.Jila,
      status: HierarchyStatus.Active,
    });

    prismaMock.hierarchyDesignation.findUnique.mockResolvedValue({
      id: 2,
      name: 'Jila Coordinator',
      level: HierarchyLevel.Jila,
      status: HierarchyStatus.Active,
    });

    const result = await service.updateUser(1, {
      firstname: 'New',
      lastname: 'Admin',
      assignments: [{ pointId: 5, designationId: 2 }],
    });

    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.admin.update).toHaveBeenCalled();
    expect(prismaMock.userHierarchyDesignation.updateMany).toHaveBeenCalled();
    expect(prismaMock.userHierarchyDesignation.createMany).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
