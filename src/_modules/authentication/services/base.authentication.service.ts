import { Injectable } from '@nestjs/common';
import { OTPType, SessionType, User } from '@prisma/client';
import { RolesKeys } from 'src/_modules/authorization/providers/roles';
import { HelperService } from 'src/_modules/user/services/helper.service';
import { UserService } from 'src/_modules/user/services/user.service';
import { hashPassword } from 'src/globals/helpers/password.helpers';
import { PrismaService } from 'src/globals/services/prisma.service';
import { SystemNotificationDispatcherService } from 'src/globals/services/system-notification-dispatcher.service';
import { ForgetPasswordDTO } from '../dto/forgot-password.dto';
import { EmailPasswordLoginDTO } from '../dto/login.dto';
import { RegisterDTO } from '../dto/register.dto';
import { ResetPasswordDTO } from '../dto/reset-password.dto';
import { VerifyOtpDTO } from '../dto/verify-otp.dto';
import { TokenService } from './jwt.service';
import { OTPService } from './otp.service';

@Injectable()
export class BaseAuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly userHelper: HelperService,
    private readonly userService: UserService,
    private readonly otpService: OTPService,
    private readonly dispatcher: SystemNotificationDispatcherService,
  ) {}

  async login(
    ip: string,
    dto: EmailPasswordLoginDTO,
  ): Promise<{
    user: any;
    AccessToken: string;
    RefreshToken: string;
  }> {
    const user = await this.userHelper.userExist({
      message: 'invalid credentials',
      ...dto,
    });
    const data = await this.userService.getProfile(user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { accessToken, refreshToken } = await this.generateAuthTokens(
      user.id,
      ip,
      dto.locale,
    );

    return {
      user: data,
      AccessToken: accessToken,
      RefreshToken: refreshToken,
    };
  }

  async forgetPassword(ip: string, forgotPasswordDTO: ForgetPasswordDTO) {
    const { email } = forgotPasswordDTO;
    const user = await this.userHelper.userExist({ email });

    await this.otpService.generateOTP(user.id, OTPType.PASSWORD_RESET);

    const token = await this.generateVerifyToken(user.id, ip);

    return { user, token };
  }

  async resetPassword(userId: Id, dto: ResetPasswordDTO) {
    const hashedPassword = await hashPassword(dto.password);
    await this.prisma.session.deleteMany({
      where: {
        userId,
      },
    });
    await this.prisma.user.update({
      data: { password: hashedPassword },
      where: { id: userId },
    });
  }

  async resendOtp(ip: string, userId: Id) {
    await this.otpService.generateOTP(userId, OTPType.EMAIL_VERIFICATION);
    return this.generateVerifyToken(userId, ip);
  }

  async verify(ip: string, userId: Id, dto: VerifyOtpDTO) {
    const user = await this.userHelper.userExist({
      id: userId,
      checkVerified: false,
    });
    await this.otpService.verifyOTP(
      userId,
      dto.otp,
      OTPType.EMAIL_VERIFICATION,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { verified: true },
    });
    const data = await this.userService.getProfile(userId);

    const { accessToken, refreshToken } = await this.generateAuthTokens(
      user.id,
      ip,
    );

    return {
      user: data,
      AccessToken: accessToken,
      RefreshToken: refreshToken,
    };
  }

  async verifyReset(userId: Id, dto: VerifyOtpDTO, ip: string) {
    const user = await this.userHelper.userExist({ id: userId });
    await this.otpService.verifyOTP(userId, dto.otp, OTPType.PASSWORD_RESET);
    const { token } = await this.tokenService.generateToken(
      userId,
      ip,
      undefined,
      undefined,
      SessionType.PASSWORD_RESET,
    );
    return { user, token };
  }

  async logout(jti: string) {
    await this.prisma.session.delete({ where: { jti } });
  }

  async refreshToken(ip: string, userId: Id) {
    const data = await this.userService.getProfile(userId);
    const { token: AccessToken } = await this.tokenService.generateToken(
      userId,
      ip,
      undefined,
    );
    return { user: data, AccessToken };
  }

  private async generateAuthTokens(
    userId: string,
    ip: string,
    locale?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { token: accessToken, jti: accessJti } =
      await this.tokenService.generateToken(
        userId,
        ip,
        undefined,
        undefined,
        SessionType.ACCESS,
        locale,
      );
    const { token: refreshToken } = await this.tokenService.generateToken(
      userId,
      ip,
      accessJti,
      undefined,
      SessionType.REFRESH,
      locale,
    );
    return { accessToken, refreshToken };
  }

  private async generateVerifyToken(
    userId: string,
    ip: string,
  ): Promise<string> {
    const { token } = await this.tokenService.generateToken(
      userId,
      ip,
      undefined,
      undefined,
      SessionType.VERIFY,
    );
    return token;
  }
  async create(dto: RegisterDTO, ip: string) {
    const { password, ...rest } = dto;
    await this.userHelper.userExistOrThrow({ email: dto.email });
    const hashedPassword = hashPassword(password);
    const newUser = await this.prisma.user.create({
      data: {
        ...rest,
        password: hashedPassword,
        roleKey: RolesKeys.CUSTOMER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        roleKey: true,
      },
    });
    await this.otpService.generateOTP(newUser.id, OTPType.EMAIL_VERIFICATION);
    const { token } = await this.tokenService.generateToken(
      newUser.id,
      ip,
      undefined,
      undefined,
      SessionType.VERIFY,
    );
    return { user: newUser, token };
  }
}
