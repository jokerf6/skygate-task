import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalAuthGuard extends AuthGuard('ACCESS') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    if (err || info || !user) {
      return null;
    }
    return user;
  }
}
