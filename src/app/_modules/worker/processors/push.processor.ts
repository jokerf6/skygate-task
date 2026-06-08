import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QueueName, JobName } from '../worker.constants';
import { NotificationService } from 'src/globals/services/notification.service';

@Processor(QueueName.PUSH)
export class PushProcessor {
  constructor(
    private readonly service: NotificationService,
  ) {}

  @Process(JobName.SEND_PUSH)
  async handleSendPush(job: Job) {
    const { notification, languageId, user } = job.data;

    if (!user) return;

    await this.service.sendSystemNotification(languageId, notification, user.id);
  }
}
