import { HttpStatus, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { I18nService } from 'nestjs-i18n';
import {
  deleteFile,
  deleteFiles,
  handelSucceededTemp,
} from 'src/_modules/media/helpers/handel-temp-files';
import { toBoolean } from '../helpers/boolean.helper';
import { localizedObject } from '../helpers/localized.return';

type ResOptions = {
  total?: number;
  code?: number;
  dashboardOptions?: any;
  errorCode?: string;
  details?: any;
};

@Injectable()
export class ResponseService {
  constructor(private readonly i18n: I18nService) { }

  private buildErrorResponse(
    message: string,
    errorCode: string,
    details?: any,
  ) {
    return {
      success: false,
      message,
      error: {
        code: errorCode,
        details,
      },
    };
  }

  private getErrorCode(status: number): string {
    return HttpStatus[status] || `HTTP_${status}`;
  }

  private async sendError(
    response: Response,
    status: number,
    messageKey,
    details?: any,
    options: ResOptions = {},
  ) {
    await this.reqDeleteFiles(response);

    const message = await this.translateMessage(
      response.req.headers['locale'],
      messageKey,
    );

    const { code: _httpCode, errorCode, details: optionDetails, ...restOptions } = options;
    const payloadDetails =
      details ?? optionDetails ?? (Object.keys(restOptions).length ? restOptions : undefined);

    return response.status(status).json(
      this.buildErrorResponse(
        message,
        errorCode || this.getErrorCode(status),
        payloadDetails,
      ),
    );
  }

  async custom(
    response: Response,
    messageKey,
    dataKey?: any,
    options: ResOptions = {},
  ) {
    const { code, ...restOptions } = options;
    if (code && code >= 400) {
      return this.sendError(response, code, messageKey, dataKey, options);
    }

    const data = this.localizeBody(
      dataKey,
      response.req.headers['locale'],
      response.req.headers['islocalized'],
    );

    const message = await this.translateMessage(
      response.req.headers['locale'],
      messageKey,
    );

    return response.status(code || HttpStatus.OK).json({
      message,
      data,
      ...restOptions,
    });
  }

  async success<Type>(
    response: Response,
    messageKey: string,
    dataKey?: Type | Type[] | null,
    options: ResOptions = {},
  ) {
    this.reqBasedEdits(response);
    const message = await this.translateMessage(
      response.req.headers['locale'],
      messageKey,
    );

    const data = this.localizeBody(
      dataKey,
      response.req.headers['locale'],
      response.req.headers['islocalized'],
    );
    const { code, ...restOptions } = options;
    response.status(code || HttpStatus.OK).json({
      message,
      data,
      ...restOptions,
    });
  }

  async created(
    response: Response,
    messageKey: string,
    dataKey?: object,
    options: ResOptions = {},
  ) {
    this.reqBasedEdits(response);

    const data = this.localizeBody(
      dataKey,
      response.req.headers['locale'],
      response.req.headers['islocalized'],
    );
    const message = await this.translateMessage(
      response.req.headers['locale'],
      messageKey,
    );

    response.status(HttpStatus.CREATED).json({
      message,
      data,
      ...options,
    });
  }

  async forbidden(
    response: Response,
    messageKey: string,
    dataKey?: object,
    options: ResOptions = {},
  ) {
    return this.sendError(
      response,
      HttpStatus.FORBIDDEN,
      messageKey,
      dataKey,
      options,
    );
  }

  async conflict(
    response: Response,
    messageKey: string,
    dataKey?: object,
    options: ResOptions = {},
  ) {
    return this.sendError(
      response,
      HttpStatus.CONFLICT,
      messageKey,
      dataKey,
      options,
    );
  }

  async notFound(
    response: Response,
    messageKey: string,
    options: ResOptions = {},
  ) {
    return this.sendError(response, HttpStatus.NOT_FOUND, messageKey, undefined, options);
  }

  async tooManyRequest(
    response: Response,
    messageKey: string,
    options: ResOptions = {},
  ) {
    return this.sendError(
      response,
      HttpStatus.TOO_MANY_REQUESTS,
      messageKey,
      undefined,
      options,
    );
  }

  async internalServerError(
    response: Response,
    messageKey: string,
    options: ResOptions = {},
  ) {
    return this.sendError(
      response,
      HttpStatus.INTERNAL_SERVER_ERROR,
      messageKey,
      undefined,
      options,
    );
  }

  async unauthorized(
    response: Response,
    messageKey: string,
    options: ResOptions = {},
  ) {
    return this.sendError(
      response,
      HttpStatus.UNAUTHORIZED,
      messageKey,
      undefined,
      options,
    );
  }

  async badRequest(
    response: Response,
    messageKey: string,
    options: ResOptions = {},
  ) {
    return this.sendError(
      response,
      HttpStatus.BAD_REQUEST,
      messageKey,
      undefined,
      options,
    );
  }

  async unProcessableData(
    response: Response,
    messageKey: string,
    options: ResOptions = {},
  ) {
    return this.sendError(
      response,
      HttpStatus.UNPROCESSABLE_ENTITY,
      messageKey,
      undefined,
      options,
    );
  }
  private reqBasedEdits(response: Response) {
    const files = response.req.file || response.req.files;
    if (files) handelSucceededTemp(files);
  }

  private async reqDeleteFiles(response: Response) {
    const req = response.req as any; // optionally type this better
    const files = req.file || req.files;

    if (!files) return;

    if (Array.isArray(files)) {
      await deleteFiles(files);
    } else if (req.file) {
      await deleteFile(req.file);
    } else if (typeof files === 'object') {
      const allFiles = Object.values(files).flat();
      await deleteFiles(allFiles);
    }
  }
  private async translateMessage(lang: string | string[], messageKey: string) {
    if (Array.isArray(messageKey)) {
      const translatedMessages = await Promise.all(
        messageKey.map((key) => this.translateMessage(lang, key)),
      );
      return translatedMessages.join(', ');
    }

    if (lang && Array.isArray(lang)) {
      const { extractedProperty, extractedKey } = this.getMessageArgs(
        messageKey,
      );

      if (extractedKey)
        return this.i18n.translate(`response.${extractedKey}`, {
          lang: lang[0],
          args: {
            property: extractedProperty,
          },
        });
      return this.i18n.translate(`response.${messageKey}`, {
        lang: lang[0],
      });
    }
    if (lang && typeof lang === 'string') {
      const { extractedProperty, extractedKey } = this.getMessageArgs(
        messageKey,
      );

      if (extractedKey)
        return this.i18n.translate(`response.${extractedKey}`, {
          lang,
          args: {
            property: extractedProperty,
          },
        });
      return this.i18n.translate(`response.${messageKey}`, {
        lang,
      });
    }
  }
  private getMessageArgs(messageKey: string) {
    const regexProperty = /\*(.*?)\*/;
    const regexKey = /0(.*?)0/;

    const matchProperty = messageKey.match(regexProperty);
    const matchKey = messageKey.match(regexKey);

    let extractedProperty;
    let extractedKey;

    if (matchProperty && matchProperty[1]) {
      extractedProperty = matchProperty[1];
    }
    if (matchKey && matchKey[1]) {
      extractedKey = matchKey[1];
    }
    return { extractedProperty, extractedKey };
  }
  private localizeBody<T>(
    data: T,
    locale: string | string[],
    isLocalized: string | string[],
  ) {
    if (!isLocalized) return data;

    const Localized = Array.isArray(isLocalized)
      ? toBoolean(isLocalized[0])
      : toBoolean(isLocalized);
    if (!Localized) {
      return data; // If not localized, return data as is
    }
    const lang = Array.isArray(locale) ? locale[0] : locale;
    if (typeof data === 'object' && data !== null) {
      const x = localizedObject(data, lang);
      return x;
    }
    return data;
  }
}
//
