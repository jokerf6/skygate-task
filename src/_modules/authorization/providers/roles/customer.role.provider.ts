import { RolesKeys } from '.';
import { mapPermissionConfigToRole } from '../../../../../src/globals/helpers/mapRoles.helper';
import { PermissionMap } from '../permissions.provider';

const customerPermissions: PermissionMap = {
  orders: ['post', 'get'],
  languages: ['get'],
  products: ['get'],
} as const satisfies PermissionMap;

export const CustomerRole = {
  id: 'test-2',
  name: { en: 'customer', ar: 'عميل' },
  key: RolesKeys.CUSTOMER,
  permissions: mapPermissionConfigToRole(customerPermissions),
};
