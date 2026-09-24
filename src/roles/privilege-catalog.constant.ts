export interface PrivilegeDefinition {
  key: string;
  module: string;
  action: string;
  description: string;
}

export interface PrivilegeGroupDefinition {
  module: string;
  label: string;
}

export interface ExplicitPrivilegeDefinition {
  action: string;
  description: string;
}

export interface ModuleDefinition {
  module: string;
  label: string;
  permissions: ExplicitPrivilegeDefinition[];
}

// ─── Privilege Catalog ────────────────────────────────────────────────────────
// Exactly 23 privileges across 8 modules — mirrors the Role-to-Privilege
// mapping defined in the product spec (Slack screenshot).
//
// Module         │ Actions                              │ Count
// ───────────────┼──────────────────────────────────────┼──────
// dashboard      │ view, report_view                    │  2
// admin_users    │ view, create, edit, delete           │  4
// roles          │ view, create, edit, delete           │  4
// privileges     │ view                                 │  1
// hierarchy      │ view, create, edit, delete           │  4
// publish_issues │ view                                 │  1
// dispatches     │ create, edit, delete, receive        │  4
// consumers      │ view, create, edit                   │  3
// ───────────────┼──────────────────────────────────────┼──────
// Total          │                                      │ 23
// ─────────────────────────────────────────────────────────────────────────────

const MODULE_DEFINITIONS: ModuleDefinition[] = [
  // ── 1. Dashboard ─────────────────────────────────────────────────────────────
  {
    module: 'dashboard',
    label: 'Dashboard',
    permissions: [
      {
        action: 'view',
        description: 'View the main dashboard and summary information',
      },
      {
        action: 'report_view',
        description: 'View dashboard reports and analytics',
      },
    ],
  },

  // ── 2. Admin User Management ─────────────────────────────────────────────────
  {
    module: 'admin_users',
    label: 'Admin User Management',
    permissions: [
      {
        action: 'view',
        description: 'View admin user accounts and their assigned roles',
      },
      {
        action: 'create',
        description: 'Create new admin user accounts with role assignments',
      },
      {
        action: 'edit',
        description: 'Edit admin user profiles and reassign roles',
      },
      {
        action: 'delete',
        description: 'Block or deactivate admin user accounts',
      },
    ],
  },

  // ── 3. Role Management ────────────────────────────────────────────────────────
  {
    module: 'roles',
    label: 'Role Management',
    permissions: [
      {
        action: 'view',
        description: 'View roles and their assigned privilege sets',
      },
      {
        action: 'create',
        description: 'Create new custom roles',
      },
      {
        action: 'edit',
        description: 'Edit role names, descriptions, and privilege sets',
      },
      {
        action: 'delete',
        description: 'Delete custom roles that have no assigned users',
      },
    ],
  },

  // ── 4. Privilege Catalog ──────────────────────────────────────────────────────
  {
    module: 'privileges',
    label: 'Privilege Catalog',
    permissions: [
      {
        action: 'view',
        description: 'View the full catalog of available system privileges',
      },
    ],
  },

  // ── 5. Organization Hierarchy ─────────────────────────────────────────────────
  {
    module: 'hierarchy',
    label: 'Organization Hierarchy',
    permissions: [
      {
        action: 'view',
        description:
          'View the organization hierarchy tree and individual nodes',
      },
      {
        action: 'create',
        description: 'Create new nodes in the organization hierarchy',
      },
      {
        action: 'edit',
        description: 'Update name, description, or status of hierarchy nodes',
      },
      {
        action: 'delete',
        description: 'Delete leaf nodes from the organization hierarchy',
      },
    ],
  },

  // ── 6. Patrika / Publish Issue ────────────────────────────────────────────────
  {
    module: 'publish_issues',
    label: 'Patrika / Publish Issue',
    permissions: [
      {
        action: 'view',
        description: 'View published issues and their dispatch details',
      },
    ],
  },

  // ── 7. Dispatch & Tracking ────────────────────────────────────────────────────
  {
    module: 'dispatches',
    label: 'Magazine Dispatch & Tracking',
    permissions: [
      {
        action: 'create',
        description: 'Create dispatches for published magazine issues',
      },
      {
        action: 'edit',
        description: 'Update dispatch tracking and transit details',
      },
      {
        action: 'delete',
        description: 'Cancel or remove unreceived dispatches',
      },
      {
        action: 'receive',
        description:
          'Receive and verify dispatched consignments (receipt confirmation)',
      },
    ],
  },

  // ── 8. Consumer / User Registration ──────────────────────────────────────────
  {
    module: 'consumers',
    label: 'Consumer & User Registration',
    permissions: [
      {
        action: 'view',
        description: 'View consumer list and registration details',
      },
      {
        action: 'create',
        description: 'Register new consumers / subscribers',
      },
      {
        action: 'edit',
        description: 'Edit consumer personal, contact, and address details',
      },
    ],
  },
];

// Runtime check to prevent accidental duplicate module names
const seenModules = new Set<string>();
for (const definition of MODULE_DEFINITIONS) {
  if (seenModules.has(definition.module)) {
    throw new Error(
      `Duplicate module "${definition.module}" in privilege catalog.`,
    );
  }
  seenModules.add(definition.module);
}

export const PRIVILEGE_CATALOG: PrivilegeDefinition[] =
  MODULE_DEFINITIONS.flatMap((definition) =>
    definition.permissions.map(({ action, description }) => ({
      key: `${definition.module}.${action}`,
      module: definition.module,
      action,
      description,
    })),
  );

export const PRIVILEGE_GROUPS: PrivilegeGroupDefinition[] =
  MODULE_DEFINITIONS.map((definition) => ({
    module: definition.module,
    label: definition.label,
  }));

export const ADMIN_ROLE_NAME = 'ADMIN';
export const ORGANIZATION_MEMBER_ROLE_NAME = 'ORGANIZATION_MEMBER';
export const ORGANIZATION_MEMBER_DEFAULT_PRIVILEGES = [
  'dashboard.view',
  'dashboard.report_view',
  'publish_issues.view',
  'dispatches.receive',
  'consumers.view',
  'consumers.create',
  'consumers.edit',
];
