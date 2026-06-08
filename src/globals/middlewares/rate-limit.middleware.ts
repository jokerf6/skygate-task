import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { RedisService } from 'src/app/_modules/redis/redis.service';
import { NextFunction, Request, Response } from 'express';

const WINDOW_SECONDS = Number(env('WINDOW_SECONDS') ?? 60);
const MAX_REQUESTS = Number(env('MAX_REQUESTS') ?? 100);
const BLOCK_DURATION_SECONDS = Number(env('BLOCK_DURATION_SECONDS') ?? 3600);

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(private readonly redis: RedisService) {}

  async use(req: Request, _: Response, next: NextFunction) {

    if (req.baseUrl === '/media') {
      return next();
    }
    const ip = req.ip;
    const key = `rate-limit:${req.baseUrl}:${ip}`;
    const blockKey = `rate-limit-blocked:${req.baseUrl}:${ip}`;

    const isBlocked = await this.redis.get(blockKey);
    if (isBlocked) {
      throw new HttpException(
        'Too many requests - try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, WINDOW_SECONDS);
    }
    if (current > MAX_REQUESTS) {
      await this.redis.set(blockKey, '1', BLOCK_DURATION_SECONDS);
      throw new HttpException(
        'Too many requests - you are blocked for 1 hour',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}
