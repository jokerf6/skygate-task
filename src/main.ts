import './declares';

import * as cookieParser from 'cookie-parser';
import * as requestIp from 'request-ip';
import * as swStats from 'swagger-stats';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { config } from 'dotenv';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { I18nService } from 'nestjs-i18n';
import { AppModule } from './app/app.module';
import { corsConfig } from './configs/cors.config';
import { createMorganMiddleware } from './configs/morgan.config';
import { globalValidationPipeOptions } from './configs/pipes.config';
import { swaggerConfig } from './configs/swagger.config';
import { bindConsoleToLogger } from './configs/winston.config';
import { GlobalExceptionFilter } from './globals/filters/global.exception.filter';
import { ResponseService } from './globals/services/response.service';

const environment = env('NODE_ENV') || 'development';
const envFileName = environment == 'production' ? '.env.prod' : '.env';
config({ path: envFileName, override: true });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: corsConfig,
    bufferLogs: true,
  });

  const port = +env('PORT') || 3000;
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  bindConsoleToLogger(logger);
  app.use(createMorganMiddleware(logger));

  app.use(cookieParser(env('COOKIE_SECRET'), {}));
  const i18nService =
    app.get<I18nService<Record<string, unknown>>>(I18nService);
  const responseService = app.get(ResponseService);

  const prefix = env('API_PREFIX') || '';

  app.setGlobalPrefix(prefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useLogger(logger);
  app.flushLogs();
  app.useGlobalFilters(new GlobalExceptionFilter(i18nService, responseService));
  app.useGlobalPipes(new ValidationPipe(globalValidationPipeOptions));
  app.use(swStats.getMiddleware());
  app.set('trust proxy', true);
  app.use(
    requestIp.mw({
      attributeName: 'clientIp',
    }),
  );

  swaggerConfig(app);

  await app.listen(port, async () => {
    logger.log(`Server is running on port ${port}`, 'Bootstrap');
    logger.log(`Swagger is running on http://localhost:${port}${prefix}/docs`, 'Bootstrap');
  });
}
bootstrap();
