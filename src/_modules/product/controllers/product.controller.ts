import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Auth, OptionalAuth } from 'src/_modules/authentication/decorators/auth.decorator';
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
import { CreateProductDTO } from '../dto/create-product.dto';
import { FilterProductDTO } from '../dto/filter-product.dto';
import { UpdateProductDTO } from '../dto/update-product.dto';
import { selectProductOBJ } from '../prisma-args/product.prisma-select';
import { ProductService } from '../services/product.service';

const prefix = 'products';

@Controller(prefix)
@ApiTags(tag(prefix))
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly responses: ResponseService,
  ) {}

  @Post('/')
  @Auth({ prefix })
  @ApiCreatedResponse(
    buildExamples([
      { title: 'Create Product', paginated: false, body: selectProductOBJ() },
    ]),
  )
  async create(
    @Res() res: Response,
    @Body() dto: CreateProductDTO,
  ) {
    const product = await this.productService.create(dto);
    return this.responses.created(res, 'Product created successfully', product);
  }

  @Get(['/', '/:id'])
  @OptionalAuth()
  @ApiQuery({ type: FilterProductDTO })
  @ApiOkResponse(
    buildExamples([
      { title: 'Get All Products', paginated: true, body: [selectProductOBJ()] },
      { title: 'Get Product with id', paginated: false, body: selectProductOBJ() },
    ]),
  )
  @ApiOptionalIdParam()
  async getAll(
    @Res() res: Response,
    @Filter({ dto: FilterProductDTO }) filters: FilterProductDTO,
  ) {
    const products = await this.productService.getAll(filters);
    const total = isOne(filters?.id)
      ? undefined
      : await this.productService.count(filters);

    return this.responses.success(res, 'Products returned successfully', products, {
      total,
    });
  }

  @Put('/:id')
  @Auth({ prefix })
  @ApiRequiredIdParam()
  @ApiOkResponse(
    buildExamples([
      { title: 'Update Product', paginated: false, body: selectProductOBJ() },
    ]),
  )
  async update(
    @Res() res: Response,
    @Param() { id }: RequiredIdParam,
    @Body() dto: UpdateProductDTO,
  ) {
    const product = await this.productService.update(id, dto);
    return this.responses.success(res, 'Product updated successfully', product);
  }

  @Delete('/:id')
  @Auth({ prefix })
  @ApiRequiredIdParam()
  async delete(
    @Res() res: Response,
    @Param() { id }: RequiredIdParam,
  ) {
    await this.productService.delete(id);
    return this.responses.success(res, 'Product deleted successfully');
  }
}
