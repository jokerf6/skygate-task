import { Module } from '@nestjs/common';

import { TokenService } from '../authentication/services/jwt.service';
import { OTPService } from '../authentication/services/otp.service';
import { MeController } from './controllers/me.controller';
import { HelperService } from './services/helper.service';
import { UserService } from './services/user.service';

@Module({
  imports: [],
  controllers: [MeController],
  providers: [UserService, OTPService, TokenService, HelperService],
  exports: [UserService],
})
export class UserModule {}
