import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RedisService } from 'src/app/_modules/redis/redis.service';

@Injectable()
export class OrderRateLimitGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ip = request.clientIp || request.ip;
    const identifier = user?.id || ip;

    const key = `rate_limit:order_create:${identifier}`;
    const limit = 5;
    const ttl = 60;

    const redis = this.redisService.getClient();
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, ttl);
    }

    if (count > limit) {
      throw new HttpException(
        'too_many_requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
