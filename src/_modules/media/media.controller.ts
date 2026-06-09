import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ApiScope } from 'src/decorators/api/api-scope.decorator';
import { tag } from 'src/globals/helpers/tag.helper';
import { MediaService } from './services/media.service';

const prefix = 'media';
const LOCAL_UPLOAD_FOLDER = 'uploads';
@Controller(prefix)
@ApiTags(tag(prefix))
@ApiScope(['admin', 'customer'])
export class MediaController {
  constructor(private mediaService: MediaService) {}
  @Get('/')
  async returnMedia(@Res() res: Response, @Query('media') media: string) {
    const normalizedMedia = this.normalizeMediaPath(media);
    await this.mediaService.isMediaExist(normalizedMedia);
    return res.sendFile(normalizedMedia, {
      root: env('UPLOADS_PATH'),
    });
  }

  private normalizeMediaPath(media: string): string {
    const cleanedMedia = media?.replace(/^\/+/, '');
    return cleanedMedia?.startsWith(`${LOCAL_UPLOAD_FOLDER}/`)
      ? cleanedMedia
      : `${LOCAL_UPLOAD_FOLDER}/${cleanedMedia}`;
  }
}
