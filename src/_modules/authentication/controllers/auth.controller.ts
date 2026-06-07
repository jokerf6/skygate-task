import { Body, Controller, Post, Res, UnprocessableEntityException, UseInterceptors } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { SessionType } from '@prisma/client';
import { Response } from 'express';
import { CurrentUser } from 'src/_modules/authentication/decorators/current-user.decorator';
import { RolesKeys } from 'src/_modules/authorization/providers/roles';
import { cookieConfig } from 'src/configs/cookie.config';
import { ApiDefaultOkResponse } from 'src/globals/helpers/generate-example.helper';
import { tag } from 'src/globals/helpers/tag.helper';
import { ResponseService } from 'src/globals/services/response.service';
import { Auth } from '../decorators/auth.decorator';
import { IpAddress } from '../decorators/ip.decorator';
import { ForgetPasswordDTO } from '../dto/forgot-password.dto';
import { BioLoginDTO, EmailPasswordLoginDTO } from '../dto/login.dto';
import { ResetPasswordDTO } from '../dto/reset-password.dto';
import { VerifyOtpDTO } from '../dto/verify-otp.dto';
import { RoleInterceptor } from '../interceptor/role.interceptor';
import { BaseAuthenticationService } from '../services/base.authentication.service';
import { AdminEndpoint, AllEndpoint, CustomerEndpoint } from 'src/decorators/api/api-scope.decorator';

const prefix = 'auth';
@Controller(prefix)
@ApiTags(tag(prefix))
export class BaseAuthenticationController {
  constructor(
    private readonly service: BaseAuthenticationService,
    private readonly response: ResponseService,
  ) {}


  
  @Post('refresh-token')
   @CustomerEndpoint(undefined, false, SessionType.REFRESH)
  @AdminEndpoint(undefined, false, SessionType.REFRESH)
  @ApiDefaultOkResponse(null)
  async refreshToken(
    @IpAddress() ip: string,
    @Res() res: Response,
    @CurrentUser('id') userId: Id,
  ) {
    const { user, AccessToken } = await this.service.refreshToken(ip, userId);
    res.cookie(env('ACCESS_TOKEN_COOKIE_KEY'), AccessToken, cookieConfig);
    return this.response.success(res, 'Access token refreshed successfully', {
      user,
      AccessToken,
    });
  }



  @Post('login/:roleKey')
  @CustomerEndpoint(undefined, true)
  @AdminEndpoint(undefined, true)
  @ApiParam({
    name:'roleKey',
    enum: Object.values(RolesKeys),
    required: true,
  })
  @UseInterceptors(RoleInterceptor)
  async login(
    @IpAddress() ip: string,
    @Res() res: Response,
    @Body() dto: EmailPasswordLoginDTO,
  ) {
    const { user, AccessToken, RefreshToken } =
      await this.service.login(ip, dto);

   if(dto.deviceId) await this.service.saveDevice(dto.deviceId, user.id, dto.locale);

    res.cookie(env('ACCESS_TOKEN_COOKIE_KEY'), AccessToken, cookieConfig);

    return this.response.success(res, 'User Logged In Successfully', {
      user,
      AccessToken,
      RefreshToken,
    });
  }

  @Post('forget-password')
  @CustomerEndpoint(undefined, true)
  @AdminEndpoint(undefined, true)
  async forgetPassword(
    @IpAddress() ip: string,
    @Res() res: Response,
    @Body() dto: ForgetPasswordDTO,
  ) {
    const { user, token } = await this.service.forgetPassword(ip, dto);

    res.cookie(env('VERIFY_TOKEN_COOKIE_KEY'), token, cookieConfig);

    return this.response.success(res, 'otp sent to email successfully', {
      user,
      token,
    });
  }

  @Post('resend-otp')
    @CustomerEndpoint(undefined, false, SessionType.VERIFY)
  @AdminEndpoint(undefined, false, SessionType.VERIFY)
  async resendOtp(
    @IpAddress() ip: string,
    @Res() res: Response,
    @CurrentUser() currentUser: CurrentUser,
  ) {
    const token = await this.service.resendOtp(ip, currentUser.id);

    return this.response.success(res, 'otp resent successfully', token);
  }

  @Post('verify')
  @CustomerEndpoint(undefined, false, SessionType.VERIFY)
  @AdminEndpoint(undefined, false, SessionType.VERIFY)
  async verifyUser(
    @IpAddress() ip: string,
    @Res() res: Response,
    @Body() dto: VerifyOtpDTO,
    @CurrentUser() currentUser: CurrentUser,
  ) {
    const { user, AccessToken, RefreshToken } =
      await this.service.verify(ip, currentUser.id, dto);

    res.cookie(env('ACCESS_TOKEN_COOKIE_KEY'), AccessToken, cookieConfig);

    return this.response.success(res, 'user verified successfully', {
      user,
      AccessToken,
      RefreshToken,
    });
  }

  @Post('verify-reset-password')
    @CustomerEndpoint(undefined, false, SessionType.VERIFY)
  @AdminEndpoint(undefined, false, SessionType.VERIFY)
  async verifyOtp(
    @IpAddress() ip: string,
    @Res() res: Response,
    @Body() dto: VerifyOtpDTO,
    @CurrentUser() currentUser: CurrentUser,
  ) {
    const { user, token } = await this.service.verifyReset(currentUser.id, dto,ip);

    res.cookie(env('RESET_PASSWORD_TOKEN_COOKIE_KEY'), token, cookieConfig);

    return this.response.success(res, 'user verified successfully', {
      user,
      token,
    });
  }

  @Post('reset-password')
  @CustomerEndpoint(undefined, false, SessionType.PASSWORD_RESET)
  @AdminEndpoint(undefined, false, SessionType.PASSWORD_RESET)
  async resetPassword(
    @Res() res: Response,
    @Body() dto: ResetPasswordDTO,
    @CurrentUser('id') userId: Id,
  ) {
    await this.service.resetPassword(userId, dto);

    return this.response.success(res, 'password reset successfully');
  }

  @Post('logout')
  @CustomerEndpoint(undefined, false,SessionType.ACCESS)
  @AdminEndpoint(undefined, false,SessionType.ACCESS)
  async logout(@Res() res: Response, @CurrentUser() { jti }: CurrentUser) {
    await this.service.logout(jti);
    return this.response.success(res, 'User Logged Out');
  }
}
