import { Process, Processor } from '@nestjs/bull';
import { InjectQueue } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { SystemNotificationStatus } from '@prisma/client';
import { NotificationService } from 'src/globals/services/notification.service';
import { PrismaService } from 'src/globals/services/prisma.service';
import { SMSService } from 'src/globals/services/sms.service';
import { EmailService } from 'src/globals/services/email.service';
import { localizedObject } from 'src/globals/helpers/localized.return';
import { QueueName, JobName } from '../worker.constants';

@Processor(QueueName.NOTIFICATION)
export class NotificationQueueProcessor {
  constructor(
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
    @InjectQueue(QueueName.SMS) private readonly smsQueue: Queue,
    @InjectQueue(QueueName.PUSH) private readonly pushQueue: Queue,
  ) {}

  @Process(JobName.PROCESS_NOTIFICATION)
  async handleNotification(job: Job) {
    const { notification, languageId, targetUsers } = job.data;

    // 1. Group Notification (Broadcast)
    if (notification.group) {
        // Dispatch to Push Queue directly (assuming group logic is handled there)
        await this.pushQueue.add(JobName.SEND_PUSH, {
            notification,
            languageId,
            user: null
        });
        return;
    }

    // 2. Individual Notifications (Fan-out)
    if (targetUsers?.length) {
      for (const user of targetUsers) {
        
        // PUSH
        if (notification.notification === SystemNotificationStatus.ACTIVE) {
            await this.pushQueue.add(JobName.SEND_PUSH, {
                notification,
                languageId,
                user
            });
        }

        // SMS
        if (notification.sms === SystemNotificationStatus.ACTIVE && user.phone) {
            await this.smsQueue.add(JobName.SEND_SMS, {
                user,
                titleKey: notification.title,
                languageId
            });
        }

        // EMAIL
        if (notification.email === SystemNotificationStatus.ACTIVE && user.email) {
            await this.emailQueue.add(JobName.SEND_EMAIL, {
                user,
                titleKey: notification.title,
                languageId
            });
        }
      }
    }
  }
}
