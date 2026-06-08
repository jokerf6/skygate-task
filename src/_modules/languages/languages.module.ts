import { Module } from '@nestjs/common';
import { MediaService } from '../media/services/media.service';
import { LanguagesController } from './languages.controller';
import { LanguagesService } from './languages.service';
import { LanguagesCacheService } from './services/languages-cache.service';

@Module({
  imports: [],
  controllers: [LanguagesController],
  providers: [LanguagesService, LanguagesCacheService, MediaService],
})
export class LanguagesModule {}
