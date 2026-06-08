import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QueueName, JobName } from '../worker.constants';
import { EmailService } from 'src/globals/services/email.service';
import { localizedObject } from 'src/globals/helpers/localized.return';

@Processor(QueueName.EMAIL)
export class EmailProcessor {
  constructor(private readonly email: EmailService) {}

  @Process(JobName.SEND_EMAIL)
  async handleSendEmail(job: Job) {
    const { user, notification, languageId } = job.data;
    const message =
      (localizedObject(notification.body, languageId) as string) ||
      (localizedObject(notification.title, languageId) as string);
    await this.email.sendEmail(user.email, message);
  }
}
