import { Module } from '@nestjs/common';

import { AuditModule } from 'src/app/_modules/audit/audit.module';
import { EmailService } from 'src/globals/services/email.service';
import { HelperService } from '../user/services/helper.service';
import { UserService } from '../user/services/user.service';
import { BaseAuthenticationController } from './controllers/auth.controller';
import { BaseAuthenticationService } from './services/base.authentication.service';
import { TokenService } from './services/jwt.service';
import { OTPService } from './services/otp.service';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { ResetPasswordTokenStrategy } from './strategies/reset-password-token.strategy';
import { VerifyTokenStrategy } from './strategies/verify-token.strategy';
import { VisitorStrategy } from './strategies/visitor.strategy';

@Module({
  imports: [AuditModule],
  controllers: [BaseAuthenticationController],
  providers: [
    TokenService,
    EmailService,
    BaseAuthenticationService,
    AccessTokenStrategy,
    VisitorStrategy,
    ResetPasswordTokenStrategy,
    RefreshTokenStrategy,
    VerifyTokenStrategy,
    UserService,
    OTPService,
    HelperService,
  ],
  exports: [BaseAuthenticationService, TokenService],
})
export class AuthenticationModule {}
