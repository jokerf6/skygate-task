import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Inject,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston';
import { ResponseService } from 'src/globals/services/response.service';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly responseService: ResponseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {}

  private extractExceptionDetails(exceptionResponse: unknown) {
    if (!exceptionResponse || typeof exceptionResponse !== 'object') {
      return undefined;
    }

    const response = exceptionResponse as Record<string, any>;
    const { message, statusCode, error, ...details } = response;

    if (Object.keys(details).length > 0) {
      return details;
    }

    return error ?? undefined;
  }

  async catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      const messageKey =
        exceptionResponse?.message || exceptionResponse || 'internal_server_error';
      const details = this.extractExceptionDetails(exceptionResponse);

      switch (status) {
        case 500:
          await this.responseService.internalServerError(response, messageKey, {
            details,
          });
          break;
        case 400: {
          await this.responseService.badRequest(response, messageKey, {
            details,
          });
          break;
        }
        case 401:
          await this.responseService.unauthorized(response, messageKey, {
            details,
          });
          break;
        case 403:
          await this.responseService.forbidden(
            response,
            messageKey,
            details,
          );
          break;
        case 404:
          await this.responseService.notFound(response, messageKey, {
            details,
          });
          break;
        case 409:
          await this.responseService.conflict(response, messageKey, details, {
            details,
          });
          break;
        case 429:
          await this.responseService.tooManyRequest(response, messageKey, {
            details,
          });
          break;
        case 412:
          {
            await this.responseService.custom(
              response,
              messageKey,
              details,
              { code: status, details },
            );
          }
          break;
        case 413:
          await this.responseService.custom(
            response,
            messageKey,
            details,
            { code: status, details },
          );
          break;
        case 422:
          await this.responseService.unProcessableData(response, messageKey, {
            details,
          });
          break;
        default:
          this.logger.error(
            `Unhandled HTTP exception: ${status}`,
            exception instanceof Error ? exception.stack : undefined,
            'GlobalExceptionFilter',
          );
          break;
      }
    } else {
      this.logger.error(
        'Unhandled non-HTTP exception',
        exception instanceof Error ? exception.stack : undefined,
        'GlobalExceptionFilter',
      );
      await this.responseService.internalServerError(
        response,
        'Internal server error',
        {
          details: exception instanceof Error ? exception.message : exception,
        },
      );
    }
  }
}
