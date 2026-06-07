import { PartialType } from '@nestjs/swagger';
import { Optional } from 'src/decorators/dto/optional-input.decorator';
import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateExist } from 'src/decorators/dto/validators/validate-found-number.decorator';
import { ValidateName } from 'src/decorators/dto/validators/validate-json.decorator';
import { ValidateNumber } from 'src/decorators/dto/validators/validate-number.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';
import { ValidateUnique } from 'src/decorators/dto/validators/validate-unique-number.decorator';

export class CreateRoleDTO {
  @Required()
  @ValidateName()
  name: Json;

  @Required()
  @ValidateString()
  @ValidateUnique<'role'>({ model: 'role' })
  roleKey: string;
    @Optional({ type: 'number', isArray: true })
  @ValidateNumber()
  @ValidateExist<'permission'>({ model: 'permission', isArray: true })
  permissionIds: number[];
}
export class UpdateRoleDTO extends PartialType(CreateRoleDTO) {

}
