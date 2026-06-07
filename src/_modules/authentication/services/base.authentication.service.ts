import { Injectable, NotFoundException } from '@nestjs/common';
import { OTPType, SessionType, User } from '@prisma/client';
import { RolesKeys } from 'src/_modules/authorization/providers/roles';
import { HelperService } from 'src/_modules/user/services/helper.service';
import { UserService } from 'src/_modules/user/services/user.service';
import { hashPassword } from 'src/globals/helpers/password.helpers';
import { PrismaService } from 'src/globals/services/prisma.service';
import { AuditService } from 'src/globals/services/audit.service';
import { ForgetPasswordDTO } from '../dto/forgot-password.dto';
import { BioLoginDTO, EmailPasswordLoginDTO } from '../dto/login.dto';
import { ResetPasswordDTO } from '../dto/reset-password.dto';
import { VerifyOtpDTO } from '../dto/verify-otp.dto';
import { TokenService } from './jwt.service';
import { OTPService } from './otp.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JobName, QueueName } from 'src/app/_modules/worker/worker.constants';

@Injectable()
export class BaseAuthenticationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly userHelper: HelperService,
    private readonly userService: UserService,
    private readonly otpService: OTPService,
    private readonly auditService: AuditService,
    @InjectQueue(QueueName.NOTIFICATION) private readonly notificationQueue: Queue,
  ) {}

  async login(
    ip: string,
    dto: EmailPasswordLoginDTO,
  ): Promise<{
    user: User;
    AccessToken: string;
    RefreshToken: string;
  }> {
    const isLocaleFound = await this.prisma.language.findUnique({
      where: {
        key: dto.locale,
      },
    });
    if (!isLocaleFound) {
      throw new NotFoundException('Locale not found');
    }

    const user = await this.userHelper.userExist({
      message: 'invalid credentials',
      ...dto,
    });
    await this.userHelper.userCanLogin(user, true, ip);
    const data = await this.userService.getProfile(user.id);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const {token: AccessToken, jti: AccessJti} = await this.tokenService.generateToken(
      user.id,
      ip,
      undefined,
      undefined,
      SessionType.ACCESS,
      dto.locale,
    );
    const {token: RefreshToken} = await this.tokenService.generateToken(
      user.id,
      ip,
      AccessJti,
      undefined,
      SessionType.REFRESH,
      dto.locale,
    );

    // Audit Login
    await this.auditService.logAction({
      action: 'LOGIN',
      userId: user.id.toString(),
      entityName: 'User',
      entityId: user.id.toString(),
      entityLabel: user.name || user.email,
      ip,
      metadata: { method: 'password' },
    });

    return {
      user: data,
      AccessToken,
      RefreshToken,
    };
  }

  async getBioInfo(dto: BioLoginDTO) {
    const { deviceId } = dto;
    const user = await this.prisma.user.findUnique({
      where: {
        deviceId,
      },
      select: {
        roleKey: true,
        email: true,
      },
    });
    return user;
  }

  async validateDto(dto: EmailPasswordLoginDTO) {
    const { email } = dto;
    if (!email) {
      throw new NotFoundException('Email is required for customer login');
    }
  }

  async forgetPassword(ip: string, forgotPasswordDTO: ForgetPasswordDTO) {
    const { email } = forgotPasswordDTO;
    const user = await this.userHelper.userExist({ email });

    await this.userHelper.userCanLogin(user);
    await this.otpService.generateOTP(user.id, OTPType.PASSWORD_RESET);

    const {token} = await this.tokenService.generateToken(
      user.id,
      ip,
      undefined,
      undefined,
      SessionType.VERIFY,
    );

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
    const {token} = await this.tokenService.generateToken(
      userId,
      ip,
      undefined,
      undefined,
      SessionType.VERIFY,
    );
    return token;
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
    const {token: AccessToken, jti: AccessJti} = await this.tokenService.generateToken(
      user.id,
      ip,
      undefined,
      undefined,
      SessionType.ACCESS,
    );
    const {token: RefreshToken} = await this.tokenService.generateToken(
      user.id,
      ip,
      AccessJti,
      undefined,
      SessionType.REFRESH,
    );
    return {
      user: data,
      AccessToken,
      RefreshToken,
    };
  }

  async verifyReset(userId: Id, dto: VerifyOtpDTO,ip: string) { 
    const user = await this.userHelper.userExist({ id: userId });
    await this.otpService.verifyOTP(userId, dto.otp, OTPType.PASSWORD_RESET);
    const {token} = await this.tokenService.generateToken(
      userId,
      ip,
      undefined,
      undefined,
      SessionType.PASSWORD_RESET,
    );
    return { user, token };
  }

  async logout(jti: string) {
    const session = await this.prisma.session.findUnique({
      where: { jti },
      select: { userId: true },
    });
    
    if (session) {
      await this.auditService.logAction({
        action: 'LOGOUT',
        userId: session.userId.toString(),
        entityName: 'User',
        entityId: session.userId.toString(),
      });
    }

    await this.prisma.session.delete({ where: { jti } });
  }

  async refreshToken(ip: string, userId: Id) {
    const data = await this.userService.getProfile(userId);
    const {token: AccessToken} = await this.tokenService.generateToken(
      userId,
      ip,
      undefined,
    );
    return { user: data, AccessToken };
  }

  async saveDevice(deviceId: string, userId: Id, locale?: string) {
    const isDeviceExist = await this.prisma.devices.findUnique({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
    });

    if (!isDeviceExist) {
      await this.sendNewDeviceNotification(userId, locale);
    }

    await this.prisma.devices.upsert({
      where: {
        userId_deviceId: {
          userId,
          deviceId,
        },
      },
      update: {
        lastLogin: new Date(),
      },
      create: {
        userId,
        deviceId,
      },
    });
  }

  private async sendNewDeviceNotification(userId: Id, localeKey?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, roleKey: true },
    });

    if (!user) return;

    const notifications = await this.prisma.systemNotification.findMany({
      where: {
        event: 'auth/new_device_login',
        receiverId: user.roleKey,
      },
    });

    if (notifications.length === 0) return;

    let languageId = localeKey;
    if (!languageId) {
      const defaultLang = await this.prisma.language.findFirst();
      languageId = defaultLang?.key || 'en';
    }

    for (const notification of notifications) {
      await this.notificationQueue.add(JobName.PROCESS_NOTIFICATION, {
        notification,
        languageId,
        targetUsers: [user],
      });
    }
  }
}
