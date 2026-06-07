import { BadRequestException, Inject, Injectable, LoggerService } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { BatchResponse, MulticastMessage } from 'firebase-admin/messaging';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from './prisma.service';
import { SystemNotification } from '@prisma/client';
import { localizedObject } from '../helpers/localized.return';

declare module 'firebase-admin/messaging' {
  interface Messaging {
    sendMulticast(message: MulticastMessage): Promise<BatchResponse>;
  }
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    if (!admin.apps.length && env('NOTIFICATIONS')) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const message = {
      notification: { title, body },
      data,
      token,
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`Push notification sent: ${response}`);
      return response;
    } catch (error) {
      this.logger.error(`Error sending push notification: ${error.message}`);
      throw new BadRequestException('Failed to send push notification');
    }
  }

  async subscribeToTopic(fcmToken: string, topic: string) {
    try {
      await admin.messaging().subscribeToTopic(fcmToken, topic);
    } catch (error) {
      throw new Error(`Failed to subscribe to topic ${topic}: ${error}`);
    }
  }

  async sendToTopic(topic: string, title: string, body: string) {
    const message = {
      notification: { title, body },
      topic: topic,
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log(`Notification sent to ${topic} topic.`);
      return response;
    } catch (error) {
      this.logger.error(`Error sending topic notification: ${error.message}`);
      throw error;
    }
  }

  async sendNotification(
    locale,
    data: SystemNotification,
    jti?: string,
    userId?: Id,
  ) {
    try {
      const { receiverId, group } = data;
      const title = localizedObject(data.title, locale.languageId) as string;
      const body = localizedObject(data.body, locale.languageId) as string;
      if (group) {
        await this.sendToTopic(receiverId, title, body);
        await this.prisma.notification.create({
          data: {
            title: data.title,
            body: data.body,
            groupId: receiverId,
          },
        });
      } else {
        const token = (await this.prisma.session.findUnique({ where: { jti } }))
          .fcmToken;
        await this.sendPushNotification(token, title, body);

        await this.prisma.notification.create({
          data: {
            title: data.title,
            body: data.body,
            userId,
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error sending notification: ${error.message}`);
    }
  }
}
