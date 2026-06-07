import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../services/prisma.service';

@Injectable()
export class LocaleMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _: Response, next: NextFunction) {
    const localeHeader = req.headers['locale'];
    const acceptLanguageHeader = req.headers['accept-language']?.toString();
    const isLocalizedHeader = req.headers['islocalized'];

    req.isLocalized = isLocalizedHeader === 'true';

    let locale = 'en';

    if (localeHeader) {
      locale = Array.isArray(localeHeader) ? localeHeader[0] : localeHeader;
    } else if (acceptLanguageHeader) {
      // Example: "en-US,en;q=0.9" -> "en-US" -> "en"
      const firstLang = acceptLanguageHeader.split(',')[0].trim();
      locale = firstLang.split('-')[0].split(';')[0];
    }

    locale = locale.toLowerCase();
 
    const isFound = await this.prisma.language.findUnique({
      where: { key: locale },
    });
    if (!isFound && !req.originalUrl.toLowerCase().includes('media') && !req.originalUrl.toLowerCase().includes('request-logs/dashboard')) {
      throw new NotFoundException(`This language not found or not supported.`);
    }

    next();
  }
}
