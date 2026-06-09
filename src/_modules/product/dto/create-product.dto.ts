import { MaxLength, MinLength } from 'class-validator';
import { Optional } from 'src/decorators/dto/optional-input.decorator';
import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateName } from 'src/decorators/dto/validators/validate-json.decorator';
import { ValidateNumber } from 'src/decorators/dto/validators/validate-number.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';
import { ValidateUnique } from 'src/decorators/dto/validators/validate-unique-number.decorator';

export class CreateProductDTO {
  @Required({ example: 'PROD-12345' })
  @MinLength(3)
  @MaxLength(50)
  @ValidateString()
  @ValidateUnique({ model: 'product' })
  sku: string;

  @Required()
  @MinLength(3)
  @MaxLength(200)
  @ValidateName()
  name: Json;

  @Optional()
  @ValidateName()
  description?: Json;

  @Required()
  @ValidateNumber({ allowNegative: false })
  price: number;

  @Required({ example: 50 })
  @ValidateNumber({ allowNegative: false })
  stock: number;

  @Optional({ example: 'uploads/default.png' })
  @ValidateString()
  image?: string;
}
