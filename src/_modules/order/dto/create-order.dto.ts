import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';

export class OrderItemDTO {
  @Required({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID('4', { message: 'productId must be a valid UUID' })
  productId: string;

  @Required({ example: 2 })
  @IsInt({ message: 'quantity must be an integer' })
  @Min(1, { message: 'quantity must be at least 1' })
  quantity: number;
}

export class CreateOrderDTO {
  @Required({ example: 'uniq-idemp-key-12345' })
  @ValidateString()
  idempotencyKey: string;

  @Required({ type: [OrderItemDTO] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDTO)
  items: OrderItemDTO[];
}
