import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { AuthorizationModule } from 'src/_modules/authorization/authorization.module';
import { LanguagesModule } from 'src/_modules/languages/languages.module';
import { MediaModule } from 'src/_modules/media/media.module';
import { GlobalModule } from 'src/globals/global.module';
import { LocaleMiddleware } from 'src/globals/middlewares/locale.middleware';
import { RateLimitMiddleware } from 'src/globals/middlewares/rate-limit.middleware';
import { XssMiddleware } from 'src/globals/middlewares/xss.middleware';
// import { NotificationModule } from './_modules/notification/notification.module';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { ClsModule } from 'nestjs-cls';
import { AuthenticationModule } from 'src/_modules/authentication/authentication.module';
import { buildWinstonOptions } from 'src/configs/winston.config';
import { NotificationMiddleware } from 'src/globals/middlewares/notification.middleware';
import { NotificationService } from 'src/globals/services/notification.service';
import { AuditModule } from './_modules/audit/audit.module';
import { UploadModule } from './_modules/upload/upload.module';
import { WorkerModule } from './_modules/worker/worker.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const I18N_DIR = path.join(process.cwd(), './i18n');

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: () => buildWinstonOptions(),
    }),
    ScheduleModule.forRoot(),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req) => {
          cls.set('req', req);
          if (req.user) {
            cls.set('user', req.user);
          }
        },
      },
    }),
    I18nModule.forRootAsync({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
      ],
      useFactory: (configService: ConfigService) => ({
        fallbackLanguage: configService.getOrThrow('FALLBACK_LANGUAGE'),
        loaderOptions: {
          path: I18N_DIR,
          watch: true,
        },
      }),
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang', 'local-lang']),
      ],
      inject: [ConfigService],
    }),

    GlobalModule,
    // NotificationModule,
    UploadModule,
    MediaModule,
    AuthenticationModule,
    AuthorizationModule,
    // UserModule,
    LanguagesModule,
    WorkerModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [AppService, NotificationService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LocaleMiddleware).forRoutes('*');
    consumer.apply(XssMiddleware).forRoutes('*');
    consumer.apply(RateLimitMiddleware).forRoutes('*');
    consumer.apply(NotificationMiddleware).forRoutes('*');
  }
}
