import { Optional } from 'src/decorators/dto/optional-input.decorator';
import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateEmail } from 'src/decorators/dto/validators/validate-email.decorator';
import { ValidateExist } from 'src/decorators/dto/validators/validate-found-number.decorator';
import { ValidateLoginPassword } from 'src/decorators/dto/validators/validate-password.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';

class LoginInfoDTO {
  @Required()
  @ValidateString()
  @ValidateExist({ model: 'languages', where: { key: true } })
  locale: string;
}

export class EmailPasswordLoginDTO extends LoginInfoDTO {
  @Optional()
  @ValidateEmail()
  email?: string;

  @Required()
  @ValidateLoginPassword()
  password: string;
}
