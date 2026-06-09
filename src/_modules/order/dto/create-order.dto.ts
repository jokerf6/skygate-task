import { ValidateNested } from 'class-validator';
import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateExist } from 'src/decorators/dto/validators/validate-found-number.decorator';
import { ValidateNumber } from 'src/decorators/dto/validators/validate-number.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';

export class OrderItemDTO {
  @Required({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @ValidateExist({ model: 'product', isArray: false })
  productId: string;

  @Required({ example: 2 })
  @ValidateNumber({ allowNegative: false, allowZero: false })
  quantity: number;
}

export class CreateOrderDTO {
  @Required({ example: 'uniq-idemp-key-12345' })
  @ValidateString()
  idempotencyKey: string;

  @Required({ type: [OrderItemDTO] })
  @ValidateNested({ each: true })
  items: OrderItemDTO[];
}
