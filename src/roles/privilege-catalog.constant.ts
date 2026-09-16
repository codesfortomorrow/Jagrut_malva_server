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
