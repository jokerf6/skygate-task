import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Auth } from 'src/_modules/authentication/decorators/auth.decorator';
import {
  ApiOptionalIdParam,
  ApiRequiredIdParam,
} from 'src/decorators/api/id-params.decorator';
import { Filter } from 'src/decorators/param/filter.decorator';
import { RequiredIdParam } from 'src/dtos/params/id-param.dto';
import { isOne } from 'src/globals/helpers/first-or-many';
import { buildExamples } from 'src/globals/helpers/generate-example.helper';
import { tag } from 'src/globals/helpers/tag.helper';
import { ResponseService } from 'src/globals/services/response.service';
import { UpdateUserDTO } from '../dto/create.user.dto';
import { FilterUserDTO } from '../dto/filter.user.dto';
import { selectUserOBJ } from '../prisma-args/user.prisma-select';
import { UserService } from '../services/user.service';

const prefix = 'users';
@Controller(prefix)
@ApiTags(tag(prefix), tag('auth'))
@Auth({ prefix })
export class UserController {
  constructor(
    private userService: UserService,
    private responses: ResponseService,
  ) { }
  // @Post('/')
  // async createUser(@Res() res: Response, @Body() dto: CreateUserDTO) {
  //   await this.userService.create(dto);
  //   return this.responses.success(res, 'user created successfully');
  // }

  @Get(['/', '/:id'])

  @ApiQuery({ type: FilterUserDTO })
  @ApiOkResponse(
    buildExamples([
      { title: 'Get All Users', paginated: true, body: [selectUserOBJ()] },
      { title: 'Get User with id', paginated: false, body: selectUserOBJ() },
    ]),
  )
  @ApiOptionalIdParam()
  async getAll(
    @Res() res: Response,
    @Filter({ dto: FilterUserDTO }) filters: FilterUserDTO,
  ) {
    const users = await this.userService.getAll(filters);
    const total = isOne(filters?.id)
      ? undefined
      : await this.userService.count(filters);
    return this.responses.success(res, 'Users returned successfully', users, {
      total,
    });
  }

  @Patch('/:id')
  @ApiRequiredIdParam()
  async updateUser(
    @Res() res: Response,
    @Param() { id }: RequiredIdParam,
    @Body() dto: UpdateUserDTO,
  ) {
    await this.userService.update(id, dto);
    return this.responses.success(res, 'User updated successfully');
  }

  @Delete('/:id')
  @ApiParam({ name: 'id', required: true, type: Number })
  async deleteUser(@Res() res: Response, @Param('id') id: Id) {
    await this.userService.delete(+id);
    return this.responses.success(res, 'User deleted successfully');
  }
}
