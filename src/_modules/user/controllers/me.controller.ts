import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags, PartialType } from '@nestjs/swagger';
import { Response } from 'express';
import { selectPermissionsOBJ } from 'src/_modules/authorization/prisma-args/permissions.prisma-select';
import { UploadFile } from 'src/decorators/api/upload-file.decorator';
import { buildExamples } from 'src/globals/helpers/generate-example.helper';
import { tag } from 'src/globals/helpers/tag.helper';
import { ResponseService } from 'src/globals/services/response.service';
import { Auth } from '../../authentication/decorators/auth.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import {
  EnableBioDTO,
  UpdateUserDTO,
  UpdateUserPasswordDTO,
} from '../dto/create.user.dto';
import {
  selectFlattenedUserOBJ,
} from '../prisma-args/user.prisma-select';
import { UserService } from '../services/user.service';
import { LocaleHeader } from 'src/_modules/authentication/decorators/locale.decorator';
import { FilterUserCouponDTO } from '../dto/filter.user.coupon.dto';
import { Filter } from 'src/decorators/param/filter.decorator';
import { AdminEndpoint, CustomerEndpoint } from 'src/decorators/api/api-scope.decorator';
import { SessionType } from '@prisma/client';

const prefix = 'profile';
@Controller('users/me')
@ApiTags(tag(prefix))
@Auth({  })
export class MeController {
  constructor(
    private userService: UserService,
    private responses: ResponseService,
  ) {}
  @Get('/permissions')
   @CustomerEndpoint(undefined, false,SessionType.ACCESS)
    @AdminEndpoint(undefined, false,SessionType.ACCESS)
  @ApiOkResponse(
    buildExamples([
      {
        title: 'Permissions',
        paginated: false,
        body: [selectPermissionsOBJ()],
      },
    ]),
  )
  async getPermissions(
    @Res() res: Response,
    @CurrentUser() currentUser: CurrentUser,
  ) {
    const user = await this.userService.getPermissions(currentUser.id, currentUser.jti);
    return this.responses.success(
      res,
      'User Permissions returned successfully',
      user,
    );
  }

  // @Post('/enable-bio')
  // async enableBio(
  //   @Res() res: Response,
  //   @CurrentUser() currentUser: CurrentUser,
  //   @Body() dto: EnableBioDTO,
  // ) {
  //   await this.userService.enableBio(currentUser.id, dto);
  //   return this.responses.success(res, 'bio enabled successfully');
  // }


  @Get('/')
   @CustomerEndpoint(undefined, false,SessionType.ACCESS)
  @AdminEndpoint(undefined, false,SessionType.ACCESS)
  async Profile(@Res() res: Response, @CurrentUser() currentUser: CurrentUser) {
    const user = await this.userService.getProfile(
      currentUser.id,
      currentUser.jti,
    );
    
    return this.responses.success(res, 'User returned successfully', user);
  }
   @CustomerEndpoint(undefined, false,SessionType.ACCESS)
  @AdminEndpoint(undefined, false,SessionType.ACCESS)
  @Patch('/change-password')
  async updatePassword(
    @Res() res: Response,
    @Body() dto: UpdateUserPasswordDTO,
    @CurrentUser() user: CurrentUser,
  ) {
    await this.userService.updatePassword(user.id, dto);
    return this.responses.success(res, 'user updated successfully');
  }

  // @Patch('/locale')
  // @CustomerEndpoint(undefined, false,SessionType.ACCESS)
  // @AdminEndpoint(undefined, false,SessionType.ACCESS)
  // async updateLocale(
  //   @Res() res: Response,
  //   @LocaleHeader() locale: string,
  //   @CurrentUser() user: CurrentUser,
  // ) {
  //   await this.userService.updateLocale(user.jti, locale);
  //   return this.responses.success(res, 'locale updated successfully');
  // }
  @Patch('/')
  @CustomerEndpoint(undefined, false,SessionType.ACCESS)
  @AdminEndpoint(undefined, false,SessionType.ACCESS)
  @UploadFile('image', 'user')
  async updateCurrentUser(
    @Res() res: Response,
    @Body() dto: UpdateUserDTO,
    @CurrentUser() user: CurrentUser,
  ) {
    await this.userService.updateCurrentUser(dto, user.id, user.jti);
    return this.responses.success(res, 'password updated successfully');
  }
  // @Delete('/')
  // @AdminEndpoint(undefined, false,SessionType.ACCESS)
  // async deleteCurrentUser(
  //   @Res() res: Response,
  //   @CurrentUser() user: CurrentUser,
  // ) {
  //   await this.userService.delete(user.id);
  //   return this.responses.success(res, 'user deleted successfully');
  // }
}
