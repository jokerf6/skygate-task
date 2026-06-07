import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueName } from './worker.constants';
import { NotificationQueueProcessor } from './processors/notification.processor';
import { EmailProcessor } from './processors/email.processor';
import { SmsProcessor } from './processors/sms.processor';
import { PushProcessor } from './processors/push.processor';
import { NotificationService } from 'src/globals/services/notification.service';
import { PrismaService } from 'src/globals/services/prisma.service';
import { SMSService } from 'src/globals/services/sms.service';
import { EmailService } from 'src/globals/services/email.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
            redis: {
                host: configService.get('REDIS_HOST'),
                port: configService.get('REDIS_PORT'),
            },
        }),
        inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QueueName.NOTIFICATION,
    }),
    BullModule.registerQueue({
      name: QueueName.EMAIL,
    }),
    BullModule.registerQueue({
      name: QueueName.SMS,
    }),
    BullModule.registerQueue({
      name: QueueName.PUSH,
    }),
  ],
  providers: [
    NotificationQueueProcessor,
    EmailProcessor,
    SmsProcessor,
    PushProcessor,
    NotificationService,
    PrismaService,
    SMSService,
    EmailService,
  ],
  exports: [BullModule],
})
export class WorkerModule {}
