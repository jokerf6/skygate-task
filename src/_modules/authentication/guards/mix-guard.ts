import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { validatePermissions } from 'src/globals/helpers/validatePermissions.helper';
import { ALLOW_VISITOR_METADATA_KEY } from '../decorators/auth.decorator';

@Injectable()
export class PermissionAndTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const requiredPermissions = this.reflector.getAllAndOverride(
      env('PERMISSION_METADATA_KEY') as string,
      [context.getClass(), context.getHandler()],
    );
    const allowVisitor = this.reflector.getAllAndOverride(
      ALLOW_VISITOR_METADATA_KEY,
      [context.getClass(), context.getHandler()],
    );
    const user = context.switchToHttp().getRequest().user;
    if (allowVisitor && !user) {
      return true;
    }
    const userPermissions = user?.permissions || [];
    return validatePermissions(
      `${requiredPermissions[0]}_${method.toLowerCase()}`,
      userPermissions,
    );
  }
}
