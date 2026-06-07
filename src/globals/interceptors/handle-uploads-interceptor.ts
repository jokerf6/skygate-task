import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { mapUploads } from '../helpers/media.helper';

@Injectable()
export class MapUploadsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    const files = request.file || request.files;

    mapUploads(request.body, files, true);
    return next.handle();
  }
}
