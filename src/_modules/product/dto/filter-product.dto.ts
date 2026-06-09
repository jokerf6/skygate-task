import { Optional } from 'src/decorators/dto/optional-input.decorator';
import { ValidateBoolean } from 'src/decorators/dto/validators/validate-boolean.decorator';
import { ValidateNumber } from 'src/decorators/dto/validators/validate-number.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';
import { FiltrationParamsDTO } from 'src/dtos/params/filtration-params.dto';

export class FilterProductDTO extends FiltrationParamsDTO {
  @Optional()
  @ValidateString()
  id?: Id;

  @Optional()
  @ValidateString()
  sku?: string;

  @Optional()
  @ValidateNumber({ allowNegative: false })
  minPrice?: number;

  @Optional()
  @ValidateNumber({ allowNegative: false })
  maxPrice?: number;

  @Optional()
  @ValidateBoolean()
  inStock?: boolean;

  @Optional()
  @ValidateString()
  search?: string;
}
