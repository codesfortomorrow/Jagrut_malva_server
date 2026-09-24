import { Prisma, RoleType } from '../../src/generated/prisma/client';
import {
  ADMIN_ROLE_NAME,
  MANAGER_ROLE_NAME,
  EDITOR_ROLE_NAME,
  ORGANIZATION_MEMBER_ROLE_NAME,
  ADMIN_PRIVILEGES,
  MANAGER_PRIVILEGES,
  EDITOR_PRIVILEGES,
  ORGANIZATION_MEMBER_DEFAULT_PRIVILEGES,
} from '../../src/roles/privilege-catalog.constant';

const connectPrivileges = (keys: string[]) => ({
  create: keys.map((key) => ({ privilege: { connect: { key } } })),
});

export const systemRoles: Prisma.RoleCreateInput[] = [
  {
    name: ADMIN_ROLE_NAME,
    description:
      'Full access to every module. Reserved for the top-level administrator.',
    type: RoleType.System,
    isProtected: true,
    privileges: connectPrivileges(ADMIN_PRIVILEGES),
  },
  {
    name: ORGANIZATION_MEMBER_ROLE_NAME,
    description:
      'Default access for organization members with no specific role assigned.',
    type: RoleType.System,
    isProtected: true,
    privileges: connectPrivileges(ORGANIZATION_MEMBER_DEFAULT_PRIVILEGES),
  },
];

export const businessRoles: Prisma.RoleCreateInput[] = [
  {
    name: MANAGER_ROLE_NAME,
    description:
      'Manager with broad operational access: hierarchy, admin users, dispatches, and dashboard. No delete permissions.',
    type: RoleType.Custom,
    isProtected: false,
    privileges: connectPrivileges(MANAGER_PRIVILEGES),
  },
  {
    name: EDITOR_ROLE_NAME,
    description:
      'Editor with access to content workflow: hierarchy view/edit, patrika distribution, and user registration.',
    type: RoleType.Custom,
    isProtected: false,
    privileges: connectPrivileges(EDITOR_PRIVILEGES),
  },
];
