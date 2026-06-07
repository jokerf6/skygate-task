import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { tag } from 'src/globals/helpers/tag.helper';
import { MediaService } from './services/media.service';

const prefix = 'media';
@Controller(prefix)
@ApiTags(tag(prefix))
export class MediaController {
  constructor(private mediaService: MediaService) {}
  @Get('/')
  async returnMedia(@Res() res: Response, @Query('media') media: string) {
    await this.mediaService.isMediaExist(media.replace('uploads', ''));
    return res.sendFile(media.replace('uploads', ''), {
      root: env('UPLOADS_PATH'),
    });
  }
}
