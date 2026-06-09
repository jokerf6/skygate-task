import { Process, Processor } from '@nestjs/bull';
import { EVENTS } from '@prisma/client';
import { Job } from 'bull';
import { localizedObject } from 'src/globals/helpers/localized.return';
import { EmailService } from 'src/globals/services/email.service';
import { PrismaService } from 'src/globals/services/prisma.service';
import { JobName, QueueName } from '../worker.constants';

@Processor(QueueName.EMAIL)
export class EmailProcessor {
  constructor(
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  @Process(JobName.SEND_EMAIL)
  async handleSendEmail(job: Job) {
    const { order, languageId } = job.data;
    const notification = await this.prisma.systemNotification.findUnique({
      where: { event: EVENTS.CREATE_ORDER },
      select: { body: true, title: true },
    });
    const message =
      (localizedObject(notification.body, languageId) as string) ||
      (localizedObject(notification.title, languageId) as string);
    await this.email.sendEmail(order.User.email, message);
  }
}
