import { applyDecorators } from '@nestjs/common';
import { ApiExtension, ApiTags } from '@nestjs/swagger';
import { SessionType } from '@prisma/client';
import { Auth } from 'src/_modules/authentication/decorators/auth.decorator';

export type EndpointScope = 'admin' | 'customer' | 'host';

export interface ApiScopeOptions {
  path?: string;
  visitor?: boolean;
  type?: SessionType;
}

export function ApiScope(
  scopes: EndpointScope[],
  options: ApiScopeOptions = {},
) {
  const { path, visitor = false, type = SessionType.ACCESS } = options;
  const decorators: any[] = [];

  for (const scope of scopes) {
    decorators.push(ApiExtension(`x-scope-${scope}`, true));
    if (scope === 'host') {
      decorators.push(ApiTags('Host'));
    }
  }

  decorators.push(Auth({ prefix: path, visitor, type }));

  return applyDecorators(...decorators);
}

export function AdminEndpoint(
  path?: string,
  visitor = false,
  type: SessionType = SessionType.ACCESS,
) {
  return ApiScope(['admin'], { path, visitor, type });
}

export function CustomerEndpoint(
  path?: string,
  visitor = false,
  type: SessionType = SessionType.ACCESS,
) {
  return ApiScope(['customer'], { path, visitor, type });
}

export function HostEndpoint(
  path?: string,
  visitor = false,
  type: SessionType = SessionType.ACCESS,
) {
  return ApiScope(['host'], { path, visitor, type });
}

export function AllEndpoint() {
  return applyDecorators(ApiExtension('x-scope-all', true));
}
