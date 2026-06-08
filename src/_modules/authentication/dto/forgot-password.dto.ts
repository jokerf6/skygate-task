import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateEmail } from 'src/decorators/dto/validators/validate-email.decorator';

export class ForgetPasswordDTO {
  @Required({})
  @ValidateEmail()
  email: string;
}
