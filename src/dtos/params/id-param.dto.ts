import { IsOptional, IsString } from 'class-validator';
import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';

export class RequiredIdParam {
  @Required()
  @ValidateString()
  id: Id;
}

export class OptionalIdParam {
  @IsOptional()
  @ValidateString()
  id?: Id;
}

export class RequiredIdStringParam {
  @IsString()
  id: string;
}
