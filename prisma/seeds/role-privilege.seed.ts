export interface RolePrivilegeMapping {
  roleName: string;
  privilegeKeys: string[];
}

export const rolePrivilegeMappings: RolePrivilegeMapping[] = [
  {
    roleName: 'ADMIN',
    privilegeKeys: [
      'dashboard_view',
      'geo_unit_create',
      'geo_unit_edit',
      'geo_unit_delete',
      'content_type_create',
      'content_type_edit',
      'content_type_delete',
      'data_upload',
      'data_edit',
      'data_delete',
      'data_migration',
      'data_download',
      'data_export',
      'content_view',
      'content_search',
      'content_approval',
      'content_publish',
      'content_unpublish',
      'access_management',
      'user_management',
      'role_management',
    ],
  },
  {
    roleName: 'MANAGER',
    privilegeKeys: [
      'dashboard_view',
      'geo_unit_create',
      'geo_unit_edit',
      'data_upload',
      'data_edit',
      'data_download',
      'data_export',
      'content_view',
      'content_search',
      'user_management',
    ],
  },
  {
    roleName: 'EDITOR',
    privilegeKeys: ['content_view', 'content_search'],
  },
  {
    roleName: 'ORGANIZATION_MEMBER',
    privilegeKeys: [
      'dashboard_view',
      'data_upload',
      'data_download',
      'content_view',
      'content_search',
    ],
  },
];
