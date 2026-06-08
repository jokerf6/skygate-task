import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from 'src/app/_modules/redis/redis.service';

const CACHE_NAMESPACE = 'languages';
const CACHE_TTL_SECONDS = 300;
const CACHE_VERSION_KEY = `${CACHE_NAMESPACE}:version`;

@Injectable()
export class LanguagesCacheService {
  constructor(private readonly redis: RedisService) {}

  async remember<T>(
    scope: string,
    payload: object,
    loader: () => Promise<T>,
  ): Promise<T> {
    const version = await this.getVersion();
    const cacheKey = this.buildCacheKey(scope, payload, version);
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached) as T;
    }

    const data = await loader();
    await this.redis.set(cacheKey, JSON.stringify(data), CACHE_TTL_SECONDS);
    return data;
  }

  async invalidate(): Promise<void> {
    await this.redis.incr(CACHE_VERSION_KEY);
  }

  private async getVersion(): Promise<number> {
    const currentVersion = await this.redis.get(CACHE_VERSION_KEY);
    return Number(currentVersion ?? 1);
  }

  private buildCacheKey(
    scope: string,
    payload: object,
    version: number,
  ): string {
    const normalizedPayload = this.normalizePayload(payload);
    const digest = createHash('sha1')
      .update(this.stableStringify(normalizedPayload))
      .digest('hex');

    return `${CACHE_NAMESPACE}:v${version}:${scope}:${digest}`;
  }

  private normalizePayload(payload: object) {
    return JSON.parse(JSON.stringify(payload ?? {}));
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      const recordValue = value as Record<string, unknown>;
      const keys = Object.keys(recordValue).sort();
      return `{${keys
        .map(
          (key) =>
            `${JSON.stringify(key)}:${this.stableStringify(recordValue[key])}`,
        )
        .join(',')}}`;
    }

    return JSON.stringify(value);
  }
}
