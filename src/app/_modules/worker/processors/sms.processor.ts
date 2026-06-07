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
    const { user, titleKey, languageId } = job.data;
    const title = localizedObject(titleKey, languageId) as string;
    await this.sms.sendSMS(user.phone, title);
  }
}
