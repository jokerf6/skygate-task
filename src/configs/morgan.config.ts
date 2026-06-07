import { LoggerService } from '@nestjs/common';
import * as morgan from 'morgan';

export const createMorganMiddleware = (logger: LoggerService) => {
  morgan.format('winston-professional', (tokens, req, res) => {
    const status = tokens.status(req, res) || '-';
    const responseTime = tokens['response-time'](req, res) || '0';
    const contentLength = tokens.res(req, res, 'content-length') || '0';
    const ipAddress =
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.ip ||
      '-';

    return [
      `${tokens.method(req, res)} ${tokens.url(req, res)}`,
      `status=${status}`,
      `time=${responseTime}ms`,
      `size=${contentLength}b`,
      `ip=${ipAddress}`,
      `ua="${tokens['user-agent'](req, res) || '-'}"`,
    ].join(' | ');
  });

  return morgan('winston-professional', {
    skip: () => process.env.LOG_REQUESTS === 'false',
    stream: {
      write: (message: string) => logger.log(message.trim(), 'HTTP'),
    },
  });
};
