import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { resolveSystemNotificationEvent } from 'src/globals/helpers/system-notification-event.helper';
import { PrismaService } from 'src/globals/services/prisma.service';
import { SystemNotificationDispatcherService } from 'src/globals/services/system-notification-dispatcher.service';

type Actor = {
  id: Id;
  roleKey: string;
  languageId: string;
  email?: string | null;
  phone?: string | null;
};

@Injectable()
export class NotificationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(NotificationMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: SystemNotificationDispatcherService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const actor = await this.resolveActor(req);
    const event = resolveSystemNotificationEvent(req);

    if (!actor || !event) {
      return next();
    }

    res.once('finish', () => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return;
      }

      void this.dispatcher
        .dispatch(event, actor.roleKey, actor.languageId, [actor])
        .catch((error) => {
          this.logger.error(
            `Failed to dispatch system notification for ${event}`,
            error instanceof Error ? error.stack : undefined,
          );
        });
    });

    next();
  }

  private async resolveActor(req: Request): Promise<Actor | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1];
    if (!token) return null;

    const userToken = this.verifyToken(token);
    if (!userToken) return null;

    const user = await this.prisma.user.findUnique({
      where: { id: userToken.id },
      select: {
        id: true,
        roleKey: true,
        email: true,
      },
    });

    if (!user?.roleKey) return null;

    const session = await this.prisma.session.findUnique({
      where: { jti: userToken.jti },
      select: { languageId: true },
    });

    return {
      id: user.id,
      roleKey: user.roleKey,
      email: user.email,
      languageId: session?.languageId ?? 'en',
    };
  }

  private verifyToken(token: string): { id: Id; jti: string } | null {
    try {
      return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as {
        id: Id;
        jti: string;
      };
    } catch {
      try {
        return jwt.verify(token, process.env.VERIFY_TOKEN_SECRET) as {
          id: Id;
          jti: string;
        };
      } catch {
        return null;
      }
    }
  }
}
