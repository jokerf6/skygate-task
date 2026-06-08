import { PrismaClient } from '@prisma/client';
import { seedAdmin } from './admin.seed';
import { seedLanguage } from './language.seed';
import { seedNotification } from './notification.seed';
import {
  seedPermissions,
  seedRolePermissions,
  seedRoles,
} from './permissionAndRoles.seed';

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  await seedLanguage(prisma);
  await seedPermissions(prisma);
  await seedRoles(prisma);
  await seedRolePermissions(prisma);
  await seedAdmin(prisma);
  await seedNotification(prisma);
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
