import { RolesKeys } from '.';
import { mapPermissionConfigToRole } from '../../../../../src/globals/helpers/mapRoles.helper';
import { PermissionMap } from '../permissions.provider';

const adminPermissions: PermissionMap = {
  languages: ['post', 'get', 'delete', 'patch'],
  roles: ['post', 'get', 'delete', 'patch'],
  permissions: ['get', 'patch'],
  audit: ['get'],
  products: ['post', 'get', 'delete', 'put'],
  orders: ['post', 'get'],
} as const satisfies PermissionMap;

export const AdminRole = {
  id: 'test-1',
  name: { en: 'Admin', ar: 'مشرف' },
  key: RolesKeys.ADMIN,
  permissions: mapPermissionConfigToRole(adminPermissions),
};
