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

const MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    permissions: [
      {
        action: 'view',
        description:
          'View the dashboard and available archive summary information',
      },
    ],
  },
  {
    module: 'geo_unit',
    label: 'Geographic Unit Management',
    permissions: [
      {
        action: 'create',
        description:
          'Create folders, collections, categories, and hierarchy units',
      },
      {
        action: 'edit',
        description: 'Modify existing geographic structure and hierarchy',
      },
      {
        action: 'delete',
        description: 'Delete folders, categories, and hierarchy structures',
      },
    ],
  },
  {
    module: 'content_type',
    label: 'Content Type Management',
    permissions: [
      {
        action: 'create',
        description: 'Create new content types',
      },
      {
        action: 'edit',
        description: 'Modify existing content types',
      },
      {
        action: 'delete',
        description: 'Delete content types',
      },
    ],
  },
  {
    module: 'data',
    label: 'Data Operations',
    permissions: [
      {
        action: 'upload',
        description: 'Upload files and bulk operational data',
      },
      {
        action: 'edit',
        description: 'Modify uploaded content and data within permitted scope',
      },
      {
        action: 'delete',
        description: 'Delete content and data within permitted scope',
      },
      {
        action: 'migrate',
        description: 'Import or migrate data from one category to another',
      },
      {
        action: 'download',
        description: 'Download permitted system data and files',
      },
      {
        action: 'export',
        description: 'Export data in CSV and other formats',
      },
    ],
  },
  {
    module: 'content',
    label: 'Content Workflow',
    permissions: [
      {
        action: 'view',
        description: 'View content without editing it',
      },
      {
        action: 'search',
        description: 'Search and filter stored content',
      },
      {
        action: 'approve',
        description: 'Approve or reject submitted content',
      },
      {
        action: 'publish',
        description: 'Publish content to users',
      },
      {
        action: 'unpublish',
        description: 'Remove published content',
      },
    ],
  },
  {
    module: 'access',
    label: 'Access Management',
    permissions: [
      {
        action: 'manage',
        description: 'Control who can access specific content and structures',
      },
    ],
  },
  {
    module: 'users',
    label: 'User Management',
    permissions: [
      {
        action: 'manage',
        description: 'Create, edit, and deactivate system users',
      },
    ],
  },
  {
    module: 'roles',
    label: 'Role Management',
    permissions: [
      {
        action: 'manage',
        description: 'Create and manage roles and their privileges',
      },
    ],
  },
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
  {
    module: 'publish_issues',
    label: 'Publish Issue Management',
    permissions: [
      {
        action: 'view',
        description: 'View publish issues and their details',
      },
      {
        action: 'create',
        description: 'Create new publish issues',
      },
      {
        action: 'edit',
        description: 'Update publish issues and modify their lifecycle status',
      },
      {
        action: 'delete',
        description:
          'Delete draft publish issues (must have no associated dispatches)',
      },
    ],
  },
  {
    module: 'dispatches',
    label: 'Magazine Dispatch & Tracking',
    permissions: [
      {
        action: 'view',
        description: 'View dispatches, history, and chain of custody tracking',
      },
      {
        action: 'create',
        description: 'Create dispatches for published magazine issues',
      },
      {
        action: 'edit',
        description: 'Update dispatch tracking and transit details',
      },
      {
        action: 'receive',
        description:
          'Receive and verify dispatched consignments at hierarchy points',
      },
      {
        action: 'forward',
        description:
          'Forward received consignments to downstream hierarchy points',
      },
      {
        action: 'cancel',
        description: 'Cancel unreceived or in-transit dispatches',
      },
    ],
  },
  {
    module: 'designations',
    label: 'Designation & Responsibility Management',
    permissions: [
      {
        action: 'view',
        description: 'View designations and user-designation assignments',
      },
      {
        action: 'create',
        description: 'Create designations',
      },
      {
        action: 'edit',
        description: 'Update designations and toggle status',
      },
      {
        action: 'delete',
        description: 'Delete unused designations',
      },
      {
        action: 'assign',
        description:
          'Assign, reassign, or unassign designations to users at hierarchy nodes',
      },
    ],
  },
  {
    module: 'consumers',
    label: 'Consumer & Subscriber Management',
    permissions: [
      {
        action: 'view',
        description: 'View consumer list and registration details',
      },
      {
        action: 'create',
        description: 'Register new consumers through the registration form',
      },
      {
        action: 'edit',
        description: 'Edit consumer personal, contact, and address details',
      },
      {
        action: 'status',
        description: 'Activate or deactivate consumer records',
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
export const ORGANIZATION_MEMBER_DEFAULT_PRIVILEGES = ['dashboard.view'];
