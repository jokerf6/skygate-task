import { Prisma } from '@prisma/client';

export const selectAllRolesOBJ = () => {
  const selectArgs: Prisma.RoleSelect = {
    id: true,
    name: true,
  };
  return selectArgs;
};
export const selectRoleOBJ = () => {
  const selectArgs = {
    ...selectAllRolesOBJ(),
    Permissions: [
      {
        name: true,
        method: [],
      },
    ],
  };
  return selectArgs;
};
