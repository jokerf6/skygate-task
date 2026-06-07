import { OmitType, PartialType } from '@nestjs/swagger';
import { Optional } from 'src/decorators/dto/optional-input.decorator';
import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateBoolean } from 'src/decorators/dto/validators/validate-boolean.decorator';
import { ValidateEmail } from 'src/decorators/dto/validators/validate-email.decorator';
import { ValidateExist } from 'src/decorators/dto/validators/validate-found-number.decorator';
import { ValidateNumber } from 'src/decorators/dto/validators/validate-number.decorator';
import {
  ValidateLoginPassword,
  ValidatePassword,
} from 'src/decorators/dto/validators/validate-password.decorator';
import { ValidatePhone } from 'src/decorators/dto/validators/validate-phone.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';

export class CreateUserDTO {
  @Required()
  @ValidateString()
  name: string;

  @Required()
  @ValidateEmail()
  email: string;

  @Required()
  @ValidatePhone()
  phone: string;

  @Required()
  @ValidatePassword()
  password: string;

  @Required()
  @ValidateNumber()
  @ValidateExist<'role'>({
    model: 'role',
  })
  roleKey: string;
}
export class UpdateUserDTO extends OmitType(PartialType(CreateUserDTO), [
  'password',
  'roleKey',
]) {
  @Optional()
  @ValidateString()
  deviceId?: string;

  @Optional()
  @ValidateString()
  fcm?: string;

  @Optional()
  @ValidateBoolean()
  allowNotificationByEmail?: boolean;

  @Optional()
  @ValidateString()
  locale?: string;
}

export class UpdateUserPasswordDTO {
  @Required()
  @ValidateLoginPassword()
  password: string;

  @Required()
  @ValidatePassword()
  newPassword: string;
}

export class EnableBioDTO {
  @Required()
  @ValidateString()
  deviceId: string;
}
