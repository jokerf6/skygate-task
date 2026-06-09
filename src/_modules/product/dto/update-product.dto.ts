import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProductDTO } from './create-product.dto';

export class UpdateProductDTO extends OmitType(PartialType(CreateProductDTO), [
  'sku',
]) {}
