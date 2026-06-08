import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentLocale = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['accept-language']?.split(',')[0] || 'en';
  },
);
