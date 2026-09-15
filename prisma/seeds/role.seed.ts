import { Prisma, RoleType } from '../../src/generated/prisma/client';
import {
  ADMIN_ROLE_NAME,
  ORGANIZATION_MEMBER_ROLE_NAME,
  ORGANIZATION_MEMBER_DEFAULT_PRIVILEGES,
  PRIVILEGE_CATALOG,
} from '../../src/roles/privilege-catalog.constant';

const connectPrivileges = (keys: string[]) => ({
  create: keys.map((key) => ({ privilege: { connect: { key } } })),
});

function privilegesForModules(modules: string[]): string[] {
  return PRIVILEGE_CATALOG.filter((p) => modules.includes(p.module)).map(
    (p) => p.key,
  );
}

export const systemRoles: Prisma.RoleCreateInput[] = [
  {
    name: ADMIN_ROLE_NAME,
    description:
      'Full access to every module. Reserved for the top-level administrator.',
    type: RoleType.System,
    isProtected: true,
    privileges: connectPrivileges(PRIVILEGE_CATALOG.map((p) => p.key)),
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
    name: 'MANAGER',
    description:
      'Manager with broad operational access: hierarchy, data, content, and users.',
    type: RoleType.Custom,
    isProtected: false,
    privileges: connectPrivileges(
      privilegesForModules([
        'dashboard',
        'geo_unit',
        'data',
        'content',
        'users',
      ]),
    ),
  },
  {
    name: 'EDITOR',
    description:
      'Editor with access to content workflow: viewing, searching, approving, and publishing.',
    type: RoleType.Custom,
    isProtected: false,
    privileges: connectPrivileges(
      privilegesForModules(['dashboard', 'content']),
    ),
  },
];
