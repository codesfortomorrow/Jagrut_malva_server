import { Prisma } from '../../src/generated/prisma/client';

export const privileges: Prisma.PrivilegeCreateInput[] = [
  // Dashboard
  {
    key: 'dashboard_view',
    label: 'View Dashboard',
    description:
      'Allows viewing the system dashboard and operational analytics.',
  },

  // Geographic Units
  {
    key: 'geo_unit_create',
    label: 'Create Geographic Unit',
    description: 'Allows creating organizational geographic hierarchy units.',
  },
  {
    key: 'geo_unit_edit',
    label: 'Edit Geographic Unit',
    description: 'Allows editing organizational geographic hierarchy units.',
  },
  {
    key: 'geo_unit_delete',
    label: 'Delete Geographic Unit',
    description: 'Allows deleting organizational geographic hierarchy units.',
  },

  // Content Types
  {
    key: 'content_type_create',
    label: 'Create Content Type',
    description: 'Allows creating supported system content or issue types.',
  },
  {
    key: 'content_type_edit',
    label: 'Edit Content Type',
    description:
      'Allows editing supported system content or issue type definitions.',
  },
  {
    key: 'content_type_delete',
    label: 'Delete Content Type',
    description:
      'Allows deleting supported system content or issue type definitions.',
  },

  // Data Operations
  {
    key: 'data_upload',
    label: 'Upload Data',
    description: 'Allows uploading approved bulk operational data.',
  },
  {
    key: 'data_edit',
    label: 'Edit Data',
    description:
      "Allows editing operational data within the user's permitted scope.",
  },
  {
    key: 'data_delete',
    label: 'Delete Data',
    description:
      "Allows deleting operational data within the user's permitted scope.",
  },
  {
    key: 'data_migration',
    label: 'Migrate Data',
    description: 'Allows performing approved data migration operations.',
  },
  {
    key: 'data_download',
    label: 'Download Data',
    description: 'Allows downloading permitted system data and files.',
  },
  {
    key: 'data_export',
    label: 'Export Data',
    description: 'Allows exporting permitted operational data and reports.',
  },

  // Content Workflow
  {
    key: 'content_view',
    label: 'View Content',
    description:
      'Allows viewing supported system content and issue-related information.',
  },
  {
    key: 'content_search',
    label: 'Search Content',
    description:
      'Allows searching supported system content and issue-related information.',
  },
  {
    key: 'content_approval',
    label: 'Approve Content',
    description:
      'Allows approving supported content or issue-related records where applicable.',
  },
  {
    key: 'content_publish',
    label: 'Publish Content',
    description:
      'Allows publishing supported issue-related records where applicable.',
  },
  {
    key: 'content_unpublish',
    label: 'Unpublish Content',
    description:
      'Allows unpublishing supported issue-related records where applicable.',
  },

  // Administration & Access
  {
    key: 'access_management',
    label: 'Manage Access',
    description: 'Allows managing system access and permissions.',
  },
  {
    key: 'user_management',
    label: 'Manage Users',
    description:
      'Allows creating, updating, activating, and managing user accounts.',
  },
  {
    key: 'role_management',
    label: 'Manage Roles',
    description: 'Allows managing system roles.',
  },
];
