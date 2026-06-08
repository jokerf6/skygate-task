import { ConfigService } from '@nestjs/config';

const DEFAULT_REDIS_PORT = 6379;

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createRedisConnectionOptions(
  configService: ConfigService,
): Record<string, any> {
  return {
    host: configService.getOrThrow('REDIS_HOST'),
    port: parseNumber(configService.get<string>('REDIS_PORT'), DEFAULT_REDIS_PORT),
    password: configService.get<string>('REDIS_PASSWORD') ?? undefined,
    db: parseNumber(configService.get<string>('REDIS_DB'), 0),
  };
}

export function createBullRedisConnectionOptions(configService: ConfigService) {
  return {
    ...createRedisConnectionOptions(configService),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
