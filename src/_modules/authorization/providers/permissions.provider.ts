export const permissions = [
  {
    name: { en: 'Languages', ar: 'اللغات' },
    prefix: 'languages',
    default: true,
    methods: ['get', 'delete', 'patch'],
  },

  {
    name: { en: 'Roles', ar: 'الادوار' },
    prefix: 'roles',
    default: true,
    methods: ['post', 'get', 'delete', 'patch'],
  },
  {
    name: { en: 'Audit', ar: 'السجل' },
    prefix: 'audit',
    default: true,
    methods: ['get'],
  },

  {
    name: { en: 'Permissions', ar: 'الصلاحيات' },
    prefix: 'permissions',
    default: false,
    methods: ['get', 'patch'],
  },
  {
    name: { en: 'Customers', ar: 'العملاء' },
    prefix: 'customers',
    default: false,
    methods: ['get', 'patch', 'delete'],
  },
  {
    name: { en: 'Customers Create', ar: 'إنشاء عملاء' },
    prefix: 'customers/create',
    default: true,
    methods: ['post'],
  },

  {
    name: { en: 'Products', ar: 'المنتجات' },
    prefix: 'products',
    default: true,
    methods: ['post', 'get', 'delete', 'put'],
  },
  {
    name: { en: 'Orders', ar: 'الطلبات' },
    prefix: 'orders',
    default: true,
    methods: ['post', 'get'],
  },
];

type Permission = (typeof permissions)[number];

export type PermissionMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'manage';

export type PermissionMap = Record<Permission['prefix'], PermissionMethod[]>;
