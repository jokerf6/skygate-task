import { Body, Controller, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { ApiQuery, ApiTags, PartialType } from '@nestjs/swagger';
import { Response } from 'express';
import { Auth } from 'src/_modules/authentication/decorators/auth.decorator';
import { Filter } from 'src/decorators/param/filter.decorator';
import { tag } from 'src/globals/helpers/tag.helper';
import { ResponseService } from 'src/globals/services/response.service';
import { FilterNotificationDTO } from '../dto/notification.dto';
import { NotificationService } from '../services/notification.service';

const prefix = 'notifications';
@Controller(prefix)
@ApiTags(tag(prefix))
@Auth({})
export class NotificationController {
  constructor(
    private service: NotificationService,
    private response: ResponseService,
  ) { }

  @Get('/')
  @Auth()
  @ApiQuery({ type: PartialType(FilterNotificationDTO) })
  async findAll(
    @Res() res: Response,
    @Filter({ dto: FilterNotificationDTO }) filters: FilterNotificationDTO,
  ) {
    const { data, total } = await this.service.findNotification(filters);

    return this.response.success(
      res,
      'notification fetched successfully',
      data,
      {
        total,
      },
    );
  }
}
