import { Body, Controller, Delete, Get, Patch, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { LocaleHeader } from 'src/_modules/authentication/decorators/locale.decorator';
import { selectPermissionsOBJ } from 'src/_modules/authorization/prisma-args/permissions.prisma-select';
import { ApiScope } from 'src/decorators/api/api-scope.decorator';
import { buildExamples } from 'src/globals/helpers/generate-example.helper';
import { tag } from 'src/globals/helpers/tag.helper';
import { ResponseService } from 'src/globals/services/response.service';
import { Auth } from '../../authentication/decorators/auth.decorator';
import { CurrentUser } from '../../authentication/decorators/current-user.decorator';
import { UpdateUserDTO, UpdateUserPasswordDTO } from '../dto/create.user.dto';
import { UserService } from '../services/user.service';

const prefix = 'profile';
@Controller('users/me')
@ApiTags(tag(prefix))
@ApiScope(['admin', 'customer'])
@Auth({})
export class MeController {
  constructor(
    private userService: UserService,
    private responses: ResponseService,
  ) {}
  @Get('/permissions')
  @ApiScope(['admin'])
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
    const user = await this.userService.getPermissions(
      currentUser.id,
      currentUser.jti,
    );
    return this.responses.success(
      res,
      'User Permissions returned successfully',
      user,
    );
  }
  @Get('/')
  @ApiScope(['admin', 'customer'])
  async Profile(@Res() res: Response, @CurrentUser() currentUser: CurrentUser) {
    const user = await this.userService.getProfile(
      currentUser.id,
      currentUser.jti,
    );

    return this.responses.success(res, 'User returned successfully', user);
  }
  @ApiScope(['admin', 'customer'])
  @Patch('/change-password')
  async updatePassword(
    @Res() res: Response,
    @Body() dto: UpdateUserPasswordDTO,
    @CurrentUser() user: CurrentUser,
  ) {
    await this.userService.updatePassword(user.id, dto);
    return this.responses.success(res, 'user updated successfully');
  }

  @Patch('/locale')
  @ApiScope(['admin', 'customer'])
  async updateLocale(
    @Res() res: Response,
    @LocaleHeader() locale: string,
    @CurrentUser() user: CurrentUser,
  ) {
    await this.userService.updateLocale(user.jti, locale);
    return this.responses.success(res, 'locale updated successfully');
  }

  @Patch('/')
  @ApiScope(['admin', 'customer'])
  async updateCurrentUser(
    @Res() res: Response,
    @Body() dto: UpdateUserDTO,
    @CurrentUser() user: CurrentUser,
  ) {
    await this.userService.updateCurrentUser(dto, user.id, user.jti);
    return this.responses.success(res, 'password updated successfully');
  }
  @Delete('/')
  @ApiScope(['admin', 'customer'])
  async deleteCurrentUser(
    @Res() res: Response,
    @CurrentUser() user: CurrentUser,
  ) {
    await this.userService.delete(user.id);
    return this.responses.success(res, 'user deleted successfully');
  }
}
