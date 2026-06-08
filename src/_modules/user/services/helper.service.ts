import {
  ConflictException,
  Injectable,
  PreconditionFailedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { OTPType, SessionType, User } from '@prisma/client';
import { TokenService } from 'src/_modules/authentication/services/jwt.service';
import { OTPService } from 'src/_modules/authentication/services/otp.service';
import { validateUserPassword } from 'src/globals/helpers/password.helpers';
import { PrismaService } from 'src/globals/services/prisma.service';

@Injectable()
export class HelperService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly otpService: OTPService,
  ) {}

  async getUserById(id: Id): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
    });
    if (!user) throw new UnprocessableEntityException('user_not_found');
    delete user.password;
    return user;
  }

  async userExist({
    message = 'user_not_found',
    id,
    email,
    password,
    checkVerified = true,
  }: {
    message?: string;
    id?: Id;
    email?: string;
    password?: string;
    checkVerified?: boolean;
  }): Promise<Omit<User, 'password'>> {
    const isFound = await this.prisma.user.findUnique({
      where: id ? { id } : { email },
    });

    if (!isFound) throw new UnprocessableEntityException(message);

    if (password) validateUserPassword(password, isFound.password);

    await this.userCanLogin(isFound, checkVerified);

    delete isFound.password;
    return isFound;
  }

  async userExistOrThrow({ id, email }: { id?: Id; email?: string }): Promise<void> {
    const isFound = await this.prisma.user.findUnique({
      where: id ? { id } : { email },
    });

    if (isFound) throw new ConflictException('user_already_exist');
  }

  async userCanLogin(user: User, checkVerified = true, ip?: string): Promise<void> {
    if (!user) {
      throw new UnprocessableEntityException('invalid credentials');
    }
    if (!user.verified && checkVerified) {
      await this.otpService.generateOTP(user.id, OTPType.EMAIL_VERIFICATION);
      const { token } = await this.tokenService.generateToken(
        user.id,
        ip,
        undefined,
        undefined,
        SessionType.VERIFY,
      );

      throw new PreconditionFailedException('NOT_VERIFIED', {
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          token,
        },
      } as any);
    }
    if (!user.active) {
      throw new UnprocessableEntityException('DISABLED_ACCOUNT');
    }
  }
}
