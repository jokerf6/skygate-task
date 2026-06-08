import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateOTP } from 'src/decorators/dto/validators/validate-otp.decorator';

export class VerifyOtpDTO {
  @Required()
  @ValidateOTP()
  otp: string;
}
