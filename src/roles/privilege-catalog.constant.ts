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
  key: string;
  action: string;
  description: string;
}

export interface ModuleDefinition {
  module: string;
  label: string;
  permissions: ExplicitPrivilegeDefinition[];
}

// ─── Complete Privilege Catalog ───────────────────────────────────────────────
// Exactly 45 privileges across 12 modules matching the new catalog specification.
//
// 1.  Dashboard (dashboard)                          -> 2
// 2.  Admin User Management (admin_users)            -> 4
// 3.  Role Management (roles)                        -> 4
// 4.  Privilege Catalog (privileges)                 -> 1
// 5.  Organization Hierarchy (hierarchy)             -> 4
// 6.  Patrika / Publish Issue (publish_issues)       -> 3
// 7.  Magazine Dispatch & Tracking (dispatches)      -> 7
// 8.  User Registration (consumers)                  -> 3
// 9.  Content Type Management (content_types)        -> 5
// 10. Data Management (data)                         -> 6
// 11. Access Management (access_management)          -> 1
// 12. Designation (designation)                      -> 5
// ──────────────────────────────────────────────────────────
// Total: 45 privileges
// ──────────────────────────────────────────────────────────

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  // ── 1. Dashboard (dashboard) ─────────────────────────────────────────────────
  {
    module: 'dashboard',
    label: 'Dashboard',
    permissions: [
      {
        key: 'dashboard.view',
        action: 'view',
        description: 'View the main dashboard and summary metrics',
      },
      {
        key: 'dashboard.report_view',
        action: 'report_view',
        description: 'View dashboard reports and analytics',
      },
    ],
  },

  // ── 2. Admin User Management (admin_users) ───────────────────────────────────
  {
    module: 'admin_users',
    label: 'Admin User Management',
    permissions: [
      {
        key: 'admin_users.view',
        action: 'view',
        description: 'View admin user accounts and assigned roles',
      },
      {
        key: 'admin_users.create',
        action: 'create',
        description: 'Create new admin user accounts with role assignments',
      },
      {
        key: 'admin_users.edit',
        action: 'edit',
        description: 'Edit admin user profiles and reassign roles',
      },
      {
        key: 'admin_users.delete',
        action: 'delete',
        description: 'Block or deactivate admin user accounts',
      },
    ],
  },

  // ── 3. Role Management (roles) ───────────────────────────────────────────────
  {
    module: 'roles',
    label: 'Role Management',
    permissions: [
      {
        key: 'roles.view',
        action: 'view',
        description: 'View roles and their assigned privilege sets',
      },
      {
        key: 'roles.create',
        action: 'create',
        description: 'Create new custom roles',
      },
      {
        key: 'roles.edit',
        action: 'edit',
        description: 'Edit role names, descriptions, and privilege sets',
      },
      {
        key: 'roles.delete',
        action: 'delete',
        description: 'Delete custom roles that have no assigned users',
      },
    ],
  },

  // ── 4. Privilege Catalog (privileges) ────────────────────────────────────────
  {
    module: 'privileges',
    label: 'Privilege Catalog',
    permissions: [
      {
        key: 'privileges.view',
        action: 'view',
        description: 'View the full catalog of available system privileges',
      },
    ],
  },

  // ── 5. Organization Hierarchy (hierarchy) ───────────────────────────────────
  {
    module: 'hierarchy',
    label: 'Organization Hierarchy',
    permissions: [
      {
        key: 'hierarchy.view',
        action: 'view',
        description:
          'View the organization hierarchy tree and individual nodes',
      },
      {
        key: 'hierarchy.create',
        action: 'create',
        description: 'Create new nodes in the organization hierarchy',
      },
      {
        key: 'hierarchy.edit',
        action: 'edit',
        description: 'Update name, description, or status of hierarchy nodes',
      },
      {
        key: 'hierarchy.delete',
        action: 'delete',
        description: 'Delete leaf nodes from the organization hierarchy',
      },
    ],
  },

  // ── 6. Patrika / Publish Issue (publish_issues) ──────────────────────────────
  {
    module: 'publish_issues',
    label: 'Patrika / Publish Issue',
    permissions: [
      {
        key: 'publish_issues.view',
        action: 'view',
        description: 'View published issues and their dispatch details',
      },
      {
        key: 'publish_issues.create',
        action: 'create',
        description: 'Create new magazine issues and publication batches',
      },
      {
        key: 'publish_issues.edit',
        action: 'edit',
        description: 'Update magazine issue metadata and lifecycle status',
      },
    ],
  },

  // ── 7. Magazine Dispatch & Tracking (dispatches) ─────────────────────────────
  {
    module: 'dispatches',
    label: 'Magazine Dispatch & Tracking',
    permissions: [
      {
        key: 'dispatches.create',
        action: 'create',
        description: 'Create dispatches for published magazine issues',
      },
      {
        key: 'dispatches.edit',
        action: 'edit',
        description: 'Update dispatch tracking and transit details',
      },
      {
        key: 'dispatches.cancel',
        action: 'cancel',
        description: 'Cancel unreceived or in-transit dispatches',
      },
      {
        key: 'dispatches.in_transit',
        action: 'in_transit',
        description: 'Track dispatches actively in transit',
      },
      {
        key: 'dispatches.forward',
        action: 'forward',
        description: 'Forward received consignments to downstream nodes',
      },
      {
        key: 'dispatches.receive',
        action: 'receive',
        description: 'Confirm and verify received dispatched consignments',
      },
      {
        key: 'dispatch.view',
        action: 'view',
        description: 'View dispatch entries, consignment tracking, and history',
      },
    ],
  },

  // ── 8. User Registration (consumers) ─────────────────────────────────────────
  {
    module: 'consumers',
    label: 'User Registration',
    permissions: [
      {
        key: 'user.view',
        action: 'view',
        description: 'View registered users, subscribers, and details',
      },
      {
        key: 'user.create',
        action: 'create',
        description: 'Register new users and subscribers',
      },
      {
        key: 'user.edit',
        action: 'edit',
        description: 'Edit user personal, contact, and address details',
      },
    ],
  },

  // ── 9. Content Type Management (content_types) ───────────────────────────────
  {
    module: 'content_types',
    label: 'Content Type Management',
    permissions: [
      {
        key: 'content_types.view',
        action: 'view',
        description: 'View defined content types and schemas',
      },
      {
        key: 'content_types.create',
        action: 'create',
        description: 'Create new content types and schema definitions',
      },
      {
        key: 'content_types.edit',
        action: 'edit',
        description: 'Edit content type definitions and properties',
      },
      {
        key: 'content_types.delete',
        action: 'delete',
        description: 'Delete unused content types',
      },
      {
        key: 'content_types.search',
        action: 'search',
        description: 'Search content catalog by content types and tags',
      },
    ],
  },

  // ── 10. Data Management (data) ───────────────────────────────────────────────
  {
    module: 'data',
    label: 'Data Management',
    permissions: [
      {
        key: 'data.upload',
        action: 'upload',
        description: 'Upload batch CSV/Excel data files',
      },
      {
        key: 'data.edit',
        action: 'edit',
        description: 'Modify imported data records and mappings',
      },
      {
        key: 'data.delete',
        action: 'delete',
        description: 'Remove batch uploaded data records',
      },
      {
        key: 'data.migrate',
        action: 'migrate',
        description: 'Execute data migration and conversion routines',
      },
      {
        key: 'data.download',
        action: 'download',
        description: 'Download data reports, templates, and raw exports',
      },
      {
        key: 'data.export',
        action: 'export',
        description: 'Export system datasets and operational dumps',
      },
    ],
  },

  // ── 11. Access Management (access_management) ────────────────────────────────
  {
    module: 'access_management',
    label: 'Access Management',
    permissions: [
      {
        key: 'access_management.manage',
        action: 'manage',
        description: 'Configure system-wide access controls and security rules',
      },
    ],
  },

  // ── 12. Designation (designation) ────────────────────────────────────────────
  {
    module: 'designation',
    label: 'Designation',
    permissions: [
      {
        key: 'designation.view',
        action: 'view',
        description: 'View designations across hierarchy levels',
      },
      {
        key: 'designation.create',
        action: 'create',
        description: 'Create new hierarchy designations',
      },
      {
        key: 'designation.edit',
        action: 'edit',
        description: 'Edit designations and level associations',
      },
      {
        key: 'designation.delete',
        action: 'delete',
        description: 'Delete unused designations',
      },
      {
        key: 'designation.assign',
        action: 'assign',
        description:
          'Assign or reassign users to designations at hierarchy nodes',
      },
    ],
  },
];

// Runtime check to prevent duplicate modules
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
    definition.permissions.map(({ key, action, description }) => ({
      key,
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

// ── Role Names ────────────────────────────────────────────────────────────────
export const ADMIN_ROLE_NAME = 'ADMIN';
export const MANAGER_ROLE_NAME = 'MANAGER';
export const EDITOR_ROLE_NAME = 'EDITOR';
export const ORGANIZATION_MEMBER_ROLE_NAME = 'ORGANIZATION_MEMBER';

// ── Role Privilege Definitions ────────────────────────────────────────────────
export const ADMIN_PRIVILEGES: string[] = PRIVILEGE_CATALOG.map((p) => p.key);

export const MANAGER_PRIVILEGES: string[] = [
  // 1. Dashboard
  'dashboard.view',
  'dashboard.report_view',
  // 2. Admin User Management (no delete)
  'admin_users.view',
  'admin_users.create',
  'admin_users.edit',
  // 3. Role Management (view only)
  'roles.view',
  // 5. Hierarchy (no delete)
  'hierarchy.view',
  'hierarchy.create',
  'hierarchy.edit',
  // 6. Patrika / Publish Issue
  'publish_issues.view',
  'publish_issues.create',
  'publish_issues.edit',
  // 7. Magazine Dispatch & Tracking (no cancel)
  'dispatches.create',
  'dispatches.edit',
  'dispatches.in_transit',
  'dispatches.forward',
  'dispatches.receive',
  'dispatch.view',
  // 8. User Registration
  'user.view',
  'user.create',
  'user.edit',
  // 9. Content Types (no delete)
  'content_types.view',
  'content_types.create',
  'content_types.edit',
  'content_types.search',
  // 10. Data (no delete/migrate)
  'data.upload',
  'data.edit',
  'data.download',
  'data.export',
  // 12. Designation (no delete)
  'designation.view',
  'designation.create',
  'designation.edit',
  'designation.assign',
];

export const EDITOR_PRIVILEGES: string[] = [
  // 1. Dashboard
  'dashboard.view',
  'dashboard.report_view',
  // 5. Hierarchy (view and edit)
  'hierarchy.view',
  'hierarchy.edit',
  // 6. Patrika / Publish Issue
  'publish_issues.view',
  'publish_issues.create',
  'publish_issues.edit',
  // 7. Magazine Dispatch & Tracking
  'dispatches.create',
  'dispatches.edit',
  'dispatches.in_transit',
  'dispatches.forward',
  'dispatches.receive',
  'dispatch.view',
  // 8. User Registration
  'user.view',
  'user.create',
  'user.edit',
  // 9. Content Types
  'content_types.view',
  'content_types.create',
  'content_types.edit',
  'content_types.search',
  // 12. Designation (view)
  'designation.view',
];

export const ORGANIZATION_MEMBER_DEFAULT_PRIVILEGES: string[] = [
  // 1. Dashboard
  'dashboard.view',
  'dashboard.report_view',
  // 6. Patrika
  'publish_issues.view',
  // 7. Dispatches
  'dispatches.create',
  'dispatches.receive',
  'dispatch.view',
  // 8. User Registration
  'user.view',
  'user.create',
  'user.edit',
];

// ── Key Aliases (Bidirectional resolution between formats and naming variants) ──
export const PRIVILEGE_KEY_ALIASES: Record<string, string[]> = {
  // Consumers / User Registration
  'user.view': ['consumers.view', 'user_view'],
  'user.create': ['consumers.create', 'user_create'],
  'user.edit': ['consumers.edit', 'user_edit'],
  'consumers.view': ['user.view', 'user_view'],
  'consumers.create': ['user.create', 'user_create'],
  'consumers.edit': ['user.edit', 'user_edit'],

  // Dispatches
  'dispatch.view': ['dispatches.view', 'dispatch_view'],
  'dispatches.view': ['dispatch.view', 'dispatch_view'],
  'dispatches.receive': ['receipt_confirm', 'dispatches_receive'],
  receipt_confirm: ['dispatches.receive'],
  'dispatches.create': ['dispatch_create'],
  'dispatches.edit': ['dispatch_edit'],
  'dispatches.cancel': ['dispatch_delete', 'dispatches.delete'],
  'dispatches.delete': ['dispatches.cancel', 'dispatch_delete'],
  'dispatches.forward': ['dispatch_forward'],
  'dispatches.in_transit': ['dispatch_in_transit', 'dispatches_in_transit'],

  // Publish Issues
  'publish_issues.view': ['issue_view', 'publish_issues_view'],
  issue_view: ['publish_issues.view'],
  'publish_issues.create': ['publish_issues_create'],
  'publish_issues.edit': ['publish_issues_edit'],
  'publish_issues.delete': ['publish_issues_delete'],

  // Designation (singular vs plural)
  'designation.view': ['designations.view', 'designation_view'],
  'designation.create': ['designations.create', 'designation_create'],
  'designation.edit': ['designations.edit', 'designation_edit'],
  'designation.delete': ['designations.delete', 'designation_delete'],
  'designation.assign': ['designations.assign', 'designation_assign'],
  'designations.view': ['designation.view', 'designation_view'],
  'designations.create': ['designation.create', 'designation_create'],
  'designations.edit': ['designation.edit', 'designation_edit'],
  'designations.delete': ['designation.delete', 'designation_delete'],
  'designations.assign': ['designation.assign', 'designation_assign'],

  // Roles & Privileges
  'roles.manage': ['roles.edit', 'roles.create', 'roles.view', 'roles.delete'],
};

export function resolvePrivilegeKeys(key: string): string[] {
  const result = new Set<string>();
  result.add(key);

  const aliases = PRIVILEGE_KEY_ALIASES[key];
  if (aliases) {
    for (const a of aliases) result.add(a);
  }

  // Automatic dot/underscore swapping
  if (key.includes('.')) result.add(key.replace(/\./g, '_'));
  if (key.includes('_')) result.add(key.replace(/_/g, '.'));

  return Array.from(result);
}
