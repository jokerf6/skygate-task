import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RolesKeys } from 'src/_modules/authorization/providers/roles';

@Injectable()
export class OrderOwnershipInterceptor implements NestInterceptor {
  constructor() {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    const isAdmin = user.Role?.roleKey === RolesKeys.ADMIN;
    if (!isAdmin) request.query.userId = user.id;

    return next.handle();
  }
}
