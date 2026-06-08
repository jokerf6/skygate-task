import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QueueName, JobName } from '../worker.constants';
import { SMSService } from 'src/globals/services/sms.service';
import { localizedObject } from 'src/globals/helpers/localized.return';

@Processor(QueueName.SMS)
export class SmsProcessor {
  constructor(private readonly sms: SMSService) {}

  @Process(JobName.SEND_SMS)
  async handleSendSms(job: Job) {
    const { user, notification, languageId } = job.data;
    const message =
      (localizedObject(notification.body, languageId) as string) ||
      (localizedObject(notification.title, languageId) as string);
    await this.sms.sendSMS(user.phone, message);
  }
}
