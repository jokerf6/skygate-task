import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Injectable,
} from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import { ResponseService } from 'src/globals/services/response.service';

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly i18n: I18nService, // Inject i18n service
    private readonly responseService: ResponseService, // Inject ResponseService
  ) {}

  async catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const message = exception.getResponse() as any;
      const messageKey = message['message'] || message;

      switch (status) {
        case 500:
          this.responseService.internalServerError(response, messageKey);
          break;
        case 400: {
          this.responseService.badRequest(response, messageKey);
          break;
        }
        case 401:
          this.responseService.unauthorized(response, messageKey);
          break;
        case 403:
          this.responseService.forbidden(
            response,
            messageKey,
            exception['response']['data'],
          );
          break;
        case 404:
          this.responseService.notFound(response, messageKey);
          break;
        case 409:
          this.responseService.conflict(response, messageKey);
          break;
        case 429:
          this.responseService.tooManyRequest(response, messageKey);
          break;
        case 412:
          {
            this.responseService.custom(
              response,
              messageKey,
              exception['options']['data'],
              { code: status },
            );
          }
          break;
        case 413:
          this.responseService.badRequest(response, messageKey);
          break;
        case 422:
          this.responseService.unProcessableData(response, messageKey);
          break;
        default:
          // eslint-disable-next-line no-console
          console.log(exception);
          break;
      }
    } else {
      if (env('PROCESS') && env('PROCESS') === 'production') {
      } else {
        // eslint-disable-next-line no-console
        console.log(exception);
      }
      try {
        
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to send error message to Telegram:', error);
      }
      this.responseService.internalServerError(
        response,
        'Internal server error',
      );
    }
  }
}
