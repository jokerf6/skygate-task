import { MaxLength, MinLength } from 'class-validator';
import { Optional } from 'src/decorators/dto/optional-input.decorator';
import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateName } from 'src/decorators/dto/validators/validate-json.decorator';
import { ValidateNumber } from 'src/decorators/dto/validators/validate-number.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';

export class CreateProductDTO {
  @Optional({ example: 'PROD-12345' })
  @MinLength(3)
  @MaxLength(50)
  @ValidateString()
  sku: string;

  @Required()
  @MinLength(3)
  @MaxLength(200)
  @ValidateString()
  name: string;

  @Optional()
  @ValidateName()
  description?: Json;

  @Required()
  @ValidateNumber({ allowNegative: false, allowZero: false })
  price: number;

  @Required({ example: 50 })
  @ValidateNumber({ allowNegative: false, allowZero: false })
  stock: number;

  @Optional({ example: 'uploads/default.png' })
  @ValidateString()
  image?: string;
}
