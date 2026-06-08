import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createRedisConnectionOptions } from './redis.connection';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      ...createRedisConnectionOptions(this.configService),
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    this.client.on('error', (error) => {
      this.logger.error(error.message, error.stack);
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<string> {
    if (ttl !== undefined) {
      return this.client.set(key, value, 'EX', ttl);
    }
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async expire(key: string, ttl: number): Promise<number> {
    return this.client.expire(key, ttl);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  getClient(): Redis {
    return this.client;
  }
}
