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
    const { user, titleKey, languageId } = job.data;
    const title = localizedObject(titleKey, languageId) as string;
    await this.email.sendEmail(user.email, title);
  }
}
