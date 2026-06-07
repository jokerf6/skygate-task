import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { redisClient } from 'src/redis/redis.provider';

const WINDOW_SECONDS = env('WINDOW_SECONDS'); // 1 minute
const MAX_REQUESTS = env('MAX_REQUESTS');
const BLOCK_DURATION_SECONDS = env('BLOCK_DURATION_SECONDS'); // 1 hour

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  async use(req: Request, _: Response, next: NextFunction) {

    if (req.baseUrl === '/media') {
      return next();
    }
    const ip = req.ip;
    const key = `rate-limit:${req.baseUrl}:${ip}`;
    const blockKey = `rate-limit-blocked:${req.baseUrl}:${ip}`;

    const isBlocked = await redisClient.get(blockKey);
    if (isBlocked) {
      throw new HttpException(
        'Too many requests - try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, WINDOW_SECONDS);
    }
    if (current > MAX_REQUESTS) {
      await redisClient.set(blockKey, '1', 'EX', BLOCK_DURATION_SECONDS);
      throw new HttpException(
        'Too many requests - you are blocked for 1 hour',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}
