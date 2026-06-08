import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Job, Queue } from 'bull';
import { JobName, QueueName } from '../worker.constants';

@Processor(QueueName.NOTIFICATION)
export class NotificationQueueProcessor {
    constructor(
        @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
        @InjectQueue(QueueName.SMS) private readonly smsQueue: Queue,
    @InjectQueue(QueueName.PUSH) private readonly pushQueue: Queue,
    ) { }

  @Process(JobName.PROCESS_NOTIFICATION)
  async handleNotification(job: Job) {
    const { notification, languageId, targetUsers } = job.data;

    if (!targetUsers?.length) return;

    for (const user of targetUsers) {
      if (notification.notificationAllowed) {
        await this.pushQueue.add(JobName.SEND_PUSH, {
          notification,
          languageId,
          user,
        });
      }

      if (notification.smsAllowed && user.phone) {
        await this.smsQueue.add(JobName.SEND_SMS, {
          user,
          notification,
          languageId,
        });
      }

      if (notification.emailAllowed && user.email) {
        await this.emailQueue.add(JobName.SEND_EMAIL, {
          user,
          notification,
          languageId,
        });
      }
    }
  }
}
