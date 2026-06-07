import { UseGuards, applyDecorators, SetMetadata } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { SessionType } from '@prisma/client';
import { PermissionAndTypeGuard } from '../guards/mix-guard';
import { OptionalAuthGuard } from '../guards/optional-auth-guard';
import { WsJwtGuard } from '../guards/ws.guard';
import { RequiredPermissions } from './permission.decorator';

interface AuthOptions {
  type?: SessionType;
  prefix?: string;
  visitor?: boolean;
}

export const ALLOW_VISITOR_METADATA_KEY = 'allow_visitor';

export function Auth({
  type = SessionType.ACCESS,
  prefix,
  visitor = false,
}: AuthOptions = {}) {
  const guards: any[] = [];

  if (visitor) {
    guards.push(OptionalAuthGuard);
  } else {
    guards.push(AuthGuard(type));
  }

  if (prefix) guards.push(PermissionAndTypeGuard);

  const decorators: any[] = [
    SetMetadata(ALLOW_VISITOR_METADATA_KEY, visitor),
    UseGuards(...guards),
    ApiBearerAuth(`${type} Token`),
  ];

  if (prefix) {
    decorators.push(RequiredPermissions(prefix));
  }

  return applyDecorators(...decorators);
}

export function WsAuth() {
  return applyDecorators(UseGuards(WsJwtGuard));
}

export function OptionalAuth() {
  return applyDecorators(
    UseGuards( OptionalAuthGuard),
    ApiBearerAuth(`${SessionType.ACCESS} Token`),
  );
}
