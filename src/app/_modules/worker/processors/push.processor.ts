import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QueueName, JobName } from '../worker.constants';
import { NotificationService } from 'src/globals/services/notification.service';
import { PrismaService } from 'src/globals/services/prisma.service';

@Processor(QueueName.PUSH)
export class PushProcessor {
  constructor(
    private readonly service: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  @Process(JobName.SEND_PUSH)
  async handleSendPush(job: Job) {
    const { notification, languageId, user } = job.data;
    
    // Logic extracted from original processor
    if (user) {
      const session = await this.prisma.session.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      });
      if (session) {
        await this.service.sendNotification(
          languageId,
          notification,
          session.jti,
        );
      }
    } else {
      // Broadcast / Group
      await this.service.sendNotification(languageId, notification);
    }
  }
}
