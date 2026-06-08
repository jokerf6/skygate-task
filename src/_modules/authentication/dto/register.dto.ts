import { Optional } from 'src/decorators/dto/optional-input.decorator';
import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateEmail } from 'src/decorators/dto/validators/validate-email.decorator';
import { ValidatePassword } from 'src/decorators/dto/validators/validate-password.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';

export class RegisterDTO {
  @Required()
  @ValidateString()
  name: string;

  @Required()
  @ValidateEmail()
  email: string;

  @Required()
  @ValidatePassword()
  password: string;

  @Optional()
  @ValidateString()
  image?: string;
}
