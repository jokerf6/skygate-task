import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RolesKeys } from 'src/_modules/authorization/providers/roles';
export async function seedAdmin(prisma: PrismaClient) {
  const superAdmin = {
    id: 'test-1',
    name: `super admin`,
    email: 'super@super.com',
    phone: `+966 0192725145`,
    roleKey: RolesKeys.ADMIN,
    verified: true,
    password: bcrypt.hashSync('Default@123', +process.env.HASH_SALT),
  };
  await prisma.user.upsert({
    where: {
      id: 'test-1',
    },
    create: superAdmin,
    update: {
      roleKey: RolesKeys.ADMIN,
    },
  });

  console.log('✅ Admin seeded');
}
