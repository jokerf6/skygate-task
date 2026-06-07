import { mapPermissionConfigToRole } from '../../../../../src/globals/helpers/mapRoles.helper';
import { PermissionMap } from '../permissions.provider';

const adminPermissions: PermissionMap = {
  // languages: ['post', 'get', 'delete', 'patch'],
  // users: ['get', 'delete', 'patch'],
  roles: ['post', 'get', 'delete', 'patch'],
  permissions: ['get', 'patch'],
  customers: ['get', 'delete', 'patch'],
  'customers/create': ['post'],
  audit: ['get'],
  // settings: ['get', 'patch'],
  // 'social-media': ['post', 'get', 'patch', 'delete'],
  // employees: ['post', 'get', 'patch', 'delete', 'manage'],
  // cities: ['post', 'get', 'patch', 'delete', 'manage'],
  // statistics: ['get'],
} as const satisfies PermissionMap;

export const AdminRole = {
  id: 1,
  name: { en: 'Admin', ar: 'مشرف' },
  key: 'Admin',
  default: true,
  permissions: mapPermissionConfigToRole(adminPermissions),
};
