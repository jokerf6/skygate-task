import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Auth } from 'src/_modules/authentication/decorators/auth.decorator';
import { CurrentUser } from 'src/_modules/authentication/decorators/current-user.decorator';
import { LocaleHeader } from 'src/_modules/authentication/decorators/locale.decorator';
import { ApiScope } from 'src/decorators/api/api-scope.decorator';
import { ApiOptionalIdParam } from 'src/decorators/api/id-params.decorator';
import { Filter } from 'src/decorators/param/filter.decorator';
import { isOne } from 'src/globals/helpers/first-or-many';
import { buildExamples } from 'src/globals/helpers/generate-example.helper';
import { tag } from 'src/globals/helpers/tag.helper';
import { ResponseService } from 'src/globals/services/response.service';
import { CreateOrderDTO } from '../dto/create-order.dto';
import { FilterOrderDTO } from '../dto/filter-order.dto';
import { OrderRateLimitGuard } from '../guards/order-rate-limit.guard';
import { OrderOwnershipInterceptor } from '../interceptors/order-ownership.interceptor';
import { selectOrderOBJ } from '../prisma-args/order.prisma-select';
import { OrderService } from '../services/order.service';

const prefix = 'orders';

@Controller(prefix)
@ApiTags(tag(prefix))
@Auth({ prefix })
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly responses: ResponseService,
  ) {}

  @Post('/')
  @ApiScope(['customer'])
  @UseGuards(OrderRateLimitGuard)
  @ApiCreatedResponse(
    buildExamples([
      { title: 'Create Order', paginated: false, body: selectOrderOBJ() },
    ]),
  )
  async create(
    @Res() res: Response,
    @CurrentUser() user: CurrentUser,
    @Body() dto: CreateOrderDTO,
    @LocaleHeader() locale: string,
  ) {
    const order = await this.orderService.create(user.id, dto, locale);
    return this.responses.created(res, 'Order created successfully', order);
  }

  @Get(['/', '/:id'])
  @ApiScope(['customer', 'admin'])
  @UseInterceptors(OrderOwnershipInterceptor)
  @ApiQuery({ type: FilterOrderDTO })
  @ApiOkResponse(
    buildExamples([
      { title: 'Get All Orders', paginated: true, body: [selectOrderOBJ()] },
      { title: 'Get Order with id', paginated: false, body: selectOrderOBJ() },
    ]),
  )
  @ApiOptionalIdParam()
  async getAll(
    @Res() res: Response,
    @Req() req: any,
    @Filter({ dto: FilterOrderDTO }) filters: FilterOrderDTO,
  ) {
    const orders = await this.orderService.getAll(filters);
    const total = isOne(filters?.id)
      ? undefined
      : await this.orderService.count(filters);

    return this.responses.success(res, 'Orders returned successfully', orders, {
      total,
    });
  }
}
