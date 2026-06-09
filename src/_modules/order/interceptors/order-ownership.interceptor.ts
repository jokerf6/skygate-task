import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { RolesKeys } from 'src/_modules/authorization/providers/roles';
import { PrismaService } from 'src/globals/services/prisma.service';

@Injectable()
export class OrderOwnershipInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

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
    request.filterUserId = isAdmin ? undefined : user.id;

    return next.handle();
  }
}
