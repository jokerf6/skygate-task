import { Prisma, SessionType, User } from '@prisma/client';
import { grouped } from '../helpers/auth.groupBy.helper';

export type FlattenedUser = {
  id: number;
  name: string;
  email: string;
  phone: string;
  verified: boolean;
  active: boolean;
  image: string;
  wallet: number;
  lastLoginAt: Date;
  Nationality?: {
    id: number;
    name: string;
  },
  allowNotificationByEmail: boolean;
  createdAt: Date;
  deletedAt: Date | null;
  Role?: {
    id: number;
    name: string;
  };
  Permissions?: {
    name: string;
    prefix: string;
    method: string[];
  }[];
  Language?: {
    key: string;
    name: string;
  };
};

export const transformFlattenUser = (data: any | any[]): any => {
  const transform = (
    user: User & {
      Nationality?: {
        id: number;
        name: string;
      };
      Role?: {
        id: number;
        name: string;
        RolePermission?: {
          id: number;
          Permission: {
            id: number;
            name: string;
            method: string;
            prefix: string;
          };
        }[];
      };
      Sessions?: {
        Language: {
          key: string;
          name: string;
        };
      }[];
    },
  ): FlattenedUser => {
    const flatUser: FlattenedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      verified: user.verified,
      active: user.active,
      image: user.image,
      lastLoginAt: user.lastLoginAt,
      wallet: (user as any).wallet,
      allowNotificationByEmail: (user as any).allowNotificationByEmail,
      Nationality: (user as any).Nationality,
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,
    };

    if (user?.Role) {
      flatUser.Role = {
        id: user?.Role?.id,
        name: user.Role.name,
      };

      if (user?.Role?.RolePermission) {
        flatUser.Permissions = grouped(
          user?.Role?.RolePermission.map((rp: any) => ({
            id: rp.Permission.id,
            name: rp.Permission.name,
            prefix: rp.Permission.prefix,
            method: rp.Permission.method,
          })),
        ) as { name: string; prefix: string; method: string[] }[];
      }
    }

    if (user?.Sessions?.[0]?.Language) {
      flatUser.Language = {
        key: user.Sessions[0].Language.key,
        name: user.Sessions[0].Language.name,
      };
    }

    return flatUser;
  };

  if (Array.isArray(data)) {
    return data.map(transform);
  }

  return transform(data);
};
export const selectUserOBJ = (jti?: string) => {
  const selectArgs: Prisma.UserSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    verified: true,
    roleKey: true,
    active: true,
    image: true,
    wallet: true,
    lastLoginAt: true,
    allowNotificationByEmail: true,

    Sessions: {
      where: {
        jti,
        type: SessionType.ACCESS
      },
      select: {
        Language: {
          select: {
            key: true,
            name: true,
          }
        }
      }
    },
    createdAt: true,
    deletedAt: true,
  };
  return selectArgs;
};

export const selectUserWithRoleOBJ = (jti: string) => {
  const selectArgs: Prisma.UserSelect = {
    ...(selectUserOBJ(jti) as Prisma.UserSelect),
    Role: {
      select: {
        id: true,
        roleKey: true,
        name: true,
      },
    },
  };
  return selectArgs;
};
export const selectUserWithRoleAndPermissionsOBJ = (jti: string) => {
  const selectArgs: Prisma.UserSelect = {
    ...(selectUserWithRoleOBJ(jti) as Prisma.UserSelect),
    ...(jti
      ? {
        Sessions: {
          where: {
            jti,
            type: SessionType.ACCESS,
          },
          select: {
            Language: {
              select: {
                key: true,
                name: true,
              },
            },
          },
        },
      }
      : {}),
    Role: {
      select: {
        id: true,
        name: true,
        RolePermission: {
          select: {
            id: true,
            Permission: {
              select: {
                id: true,
                name: true,
                method: true,
                prefix: true,
              },
            },
          },
        },
      },
    },
  };
  return selectArgs;
};
export const selectFlattenedUserOBJ = (jti: string) => {
  const selectArgs: FlattenedUser = {
    ...(selectUserWithRoleOBJ(jti) as any),
    Permissions: [
      {
        name: 'string',
        prefix: 'string',
        method: [],
      },
    ] as FlattenedUser['Permissions'],
  };
  return selectArgs;
};
