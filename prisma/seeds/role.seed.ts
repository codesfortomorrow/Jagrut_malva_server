import { Prisma } from '../../src/generated/prisma/client';

export const roles: Prisma.RoleCreateInput[] = [
  {
    name: 'ADMIN',
    description:
      'System administrator responsible for managing users, roles, system configuration, geographic hierarchy, and system-wide operations.',
    isSystem: true,
  },
  {
    name: 'MANAGER',
    description:
      'Manager responsible for organizational operations, distribution oversight, data management, and coordination across assigned areas.',
    isSystem: true,
  },
  {
    name: 'EDITOR',
    description:
      'Editor responsible for managing and maintaining system content and issue-related information within assigned responsibilities.',
    isSystem: true,
  },
  {
    name: 'ORGANIZATION_MEMBER',
    description:
      'Organization member responsible for assigned Patrika distribution, receipt, forwarding, and operational tracking activities.',
    isSystem: true,
  },
];
