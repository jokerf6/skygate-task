import { OrderStatus } from '@prisma/client';
import { ValidateEnum } from 'src/decorators/dto/enum.decorator';
import { Optional } from 'src/decorators/dto/optional-input.decorator';
import { OptionalSwagger } from 'src/decorators/dto/validators/optional-swagger.decorator';
import { ValidateDate } from 'src/decorators/dto/validators/validate-date.decorator';
import { ValidateNumber } from 'src/decorators/dto/validators/validate-number.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';
import { PaginationParamsDTO } from 'src/dtos/params/pagination-params.dto';

export class FilterOrderDTO extends PaginationParamsDTO {
  @Optional()
  @ValidateString()
  id?: Id;

  @Optional()
  @ValidateEnum(OrderStatus)
  status?: OrderStatus;

  @Optional()
  @ValidateDate()
  startDate?: string;

  @Optional()
  @ValidateDate()
  endDate?: string;

  @Optional()
  @ValidateNumber({ allowNegative: false })
  minTotal?: number;

  @OptionalSwagger()
  userId?: Id;
}
