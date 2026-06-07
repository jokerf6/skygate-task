import { PrismaClient } from '@prisma/client';
import { CustomerNotification } from 'src/_modules/user/_modules/customer/providers/notification.customer.provider';

const SystemNotificationData = [...CustomerNotification];

export async function seedNotification(prisma: PrismaClient) {
  for (const item of SystemNotificationData) {
    await prisma.systemNotification.upsert({
      where: {
        id: item.id,
      },
      update: {
        title: item.title,
        body: item.body,
        event: item.event,
        email: item.email,
        sms: item.sms,
        notification: item.notification,
        receiverId: item.receiverId,
        senderId: item.senderId,
        group: item.group ?? false,
      },
      create: {
        id: item.id,
        title: item.title,
        body: item.body,
        event: item.event,
        email: item.email,
        sms: item.sms,
        notification: item.notification,
        senderId: item.senderId,
        receiverId: item.receiverId,
        group: item.group ?? false,
      },
    });
  }
  console.log('✅ Notification seeded');
}
