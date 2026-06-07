export const permissions = [
  // {
  //   name: { en: 'Languages', ar: 'اللغات' },
  //   prefix: 'languages',
  //   default: true,
  //   methods: ['get', 'delete', 'patch'],
  // },
  //   {
  //   name: { en: 'Employees', ar: 'الموظفين' },
  //   prefix: 'employees',
  //   default: true,
  //   methods: ['post', 'get', 'delete', 'patch','manage'],
  // },
  // {
  //   name: { en: 'Users', ar: 'المستخدمين' },
  //   prefix: 'users',
  //   default: false,
  //   methods: ['post', 'get', 'delete', 'patch'],
  // },
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
  // {
  //   name: { en: 'Profile', ar: 'الحساب الشخصي' },
  //   prefix: 'profile',
  //   default: true,
  //   methods: ['post', 'get', 'patch','delete'],
  // },
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
  
  // {
  //   name: { en: 'filters', ar: 'الفلاتر' },
  //   prefix: 'filters',
  //   default: true,
  //   methods: ['get'],
  // },
  // {
  //   name: { en: 'settings', ar: 'الإعدادات' },
  //   prefix: 'settings',
  //   default: false,
  //   methods: ['get', 'patch'],
  // },
  // {
  //   name: { en: 'Social Media', ar: 'وسائل التواصل الاجتماعي' },
  //   prefix: 'social-media',
  //   default: false,
  //   methods: ['post', 'get', 'patch', 'delete'],
  // },
 
  
  //   {
  //   name: { en: 'Cities', ar: 'المدن' },
  //   prefix: 'cities',
  //   default: true,
  //   methods: ['post', 'get', 'patch', 'delete','manage'],
  // },
      
];

type Permission = (typeof permissions)[number];

export type PermissionMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'|'manage';

export type PermissionMap = Record<Permission['prefix'], PermissionMethod[]>;
