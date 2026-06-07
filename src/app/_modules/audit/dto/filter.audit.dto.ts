import { Optional } from 'src/decorators/dto/optional-input.decorator';
import { ValidateNumber } from 'src/decorators/dto/validators/validate-number.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';
import { PaginationParamsDTO } from 'src/dtos/params/pagination-params.dto';

export class FilterAuditDTO extends PaginationParamsDTO {
  @Optional({})
  @ValidateNumber({ allowNegative: false })
  id?: Id;

  @Optional({})
  @ValidateString()
  entityName?: string;

  @Optional()
  @ValidateString()
  entityId?: string;

}
