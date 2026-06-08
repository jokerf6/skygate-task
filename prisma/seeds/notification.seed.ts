import { PrismaClient, SystemNotification } from '@prisma/client';
import { CustomerNotification } from 'src/_modules/user/_modules/customer/providers/notification.customer.provider';

const SystemNotificationData: SystemNotification[] = [
  ...CustomerNotification
];

export async function seedNotification(prisma: PrismaClient) {
  for (const item of SystemNotificationData) {
    await prisma.systemNotification.upsert({
      where: {
        id: item.id,
      },
      update: item,
      create: item,
    });
  }
  console.log('✅ Notification seeded');
}


