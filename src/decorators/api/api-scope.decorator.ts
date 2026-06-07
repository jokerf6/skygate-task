import { applyDecorators } from '@nestjs/common';
import { ApiExtension, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/_modules/authentication/decorators/auth.decorator';
import { SessionType } from '@prisma/client';

export function AdminEndpoint(path?: string, visitor = false, type: SessionType = SessionType.ACCESS) {
  return applyDecorators(
    ApiExtension('x-scope-admin', true),
    Auth({ prefix: path, visitor, type }),
  );
}

export function CustomerEndpoint(path?: string, visitor = false, type: SessionType = SessionType.ACCESS) {
  return applyDecorators(
    ApiExtension('x-scope-customer', true),
    Auth({ prefix: path, visitor, type }),
  );
}

export function AllEndpoint() {
  return applyDecorators(
    ApiExtension('x-scope-all', true),
  );
}

export function HostEndpoint(path?: string, visitor = false, type: SessionType = SessionType.ACCESS) {
  return applyDecorators(
    ApiTags('Host'),
    ApiExtension('x-scope-host', true),
    Auth({ prefix: path, visitor, type }),
  );
}

