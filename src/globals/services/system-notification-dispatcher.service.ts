import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { EVENTS } from '@prisma/client';
import { Queue } from 'bull';
import { PrismaService } from './prisma.service';
import { JobName, QueueName } from 'src/app/_modules/worker/worker.constants';

type TargetUser = {
  id: Id;
  email?: string | null;
  phone?: string | null;
};

@Injectable()
export class SystemNotificationDispatcherService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QueueName.NOTIFICATION)
    private readonly notificationQueue: Queue,
  ) {}

  async dispatch(
    event: EVENTS,
    receiverId: string,
    languageId: string,
    targetUsers: TargetUser[],
  ): Promise<void> {
    if (!targetUsers.length) return;

    const notifications = await this.prisma.systemNotification.findMany({
      where: {
        event,
        receiverId,
        deletedAt: null,
      },
    });

    if (!notifications.length) return;

    await Promise.all(
      notifications.map((notification) =>
        this.notificationQueue.add(JobName.PROCESS_NOTIFICATION, {
          notification,
          languageId,
          targetUsers,
        }),
      ),
    );
  }
}
