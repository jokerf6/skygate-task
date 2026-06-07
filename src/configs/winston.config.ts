import * as fs from 'fs';
import * as path from 'path';
import { LoggerService } from '@nestjs/common';
import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { format as formatConsole } from 'util';

const DailyRotateFile = require('winston-daily-rotate-file');

const buildLogDirectory = (logDirectory: string) => {
  const resolvedDirectory = path.isAbsolute(logDirectory)
    ? logDirectory
    : path.join(process.cwd(), logDirectory);

  fs.mkdirSync(resolvedDirectory, { recursive: true });
  return resolvedDirectory;
};

export const buildWinstonOptions = (): WinstonModuleOptions => {
  const environment = process.env.NODE_ENV || 'development';
  const projectName = process.env.PROJECT_NAME || 'Skygate Task';
  const logDirectory = buildLogDirectory(process.env.LOG_DIR || 'logs');
  const logLevel = process.env.LOG_LEVEL || (environment === 'production' ? 'info' : 'debug');
  const isProduction = environment === 'production';

  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, context, stack }) => {
      const contextLabel = context ? `[${context}]` : '';
      const stackLabel = stack ? `\n${stack}` : '';
      return `${timestamp} ${level} ${contextLabel} ${message}${stackLabel}`;
    }),
  );

  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.uncolorize(),
    winston.format.json(),
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: logLevel,
      format: consoleFormat,
      handleExceptions: true,
    }),
    new DailyRotateFile({
      level: logLevel,
      dirname: logDirectory,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '14d',
      format: fileFormat,
    }),
    new DailyRotateFile({
      level: 'error',
      dirname: logDirectory,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxFiles: '30d',
      format: fileFormat,
    }),
  ];

  return {
    level: logLevel,
    defaultMeta: {
      service: projectName,
      environment,
    },
    transports,
    exceptionHandlers: [
      new DailyRotateFile({
        dirname: logDirectory,
        filename: 'exceptions-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxFiles: '30d',
        format: fileFormat,
      }),
    ],
    rejectionHandlers: [
      new DailyRotateFile({
        dirname: logDirectory,
        filename: 'rejections-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxFiles: '30d',
        format: fileFormat,
      }),
    ],
    exitOnError: false,
    silent: isProduction && process.env.LOG_SILENT === 'true',
  };
};

export const bindConsoleToLogger = (logger: LoggerService) => {
  console.log = (...args: unknown[]) => logger.log(formatConsole(...args), 'Console');
  console.info = (...args: unknown[]) => logger.log(formatConsole(...args), 'Console');
  console.warn = (...args: unknown[]) => logger.warn(formatConsole(...args), 'Console');
  console.error = (...args: unknown[]) =>
    logger.error(formatConsole(...args), undefined, 'Console');
  console.debug = (...args: unknown[]) => logger.debug?.(formatConsole(...args), 'Console');
};
