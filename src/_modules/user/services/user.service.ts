import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../globals/services/prisma.service';
import { OTPType, SessionType } from '@prisma/client';
import { RolesKeys } from 'src/_modules/authorization/providers/roles';
import { firstOrMany } from 'src/globals/helpers/first-or-many';
import {
  hashPassword,
  validateUserPassword,
} from 'src/globals/helpers/password.helpers';
import { VerifyResetOtpDTO } from '../../authentication/dto/reset-password.dto';
import { TokenService } from '../../authentication/services/jwt.service';
import { OTPService } from '../../authentication/services/otp.service';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UpdateUserPasswordDTO,
} from '../dto/create.user.dto';
import { FilterUserDTO } from '../dto/filter.user.dto';
import { getUserArgs } from '../prisma-args/user.prisma-ags';
import {
  FlattenedUser,
  selectUserWithRoleAndPermissionsOBJ,
  transformFlattenUser,
} from '../prisma-args/user.prisma-select';
import { HelperService } from './helper.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly otpService: OTPService,
    private readonly helper: HelperService,
  ) {}

  async getUser(userId: Id, jti?: string): Promise<FlattenedUser> {
    const selectObj = selectUserWithRoleAndPermissionsOBJ(jti);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: selectObj,
    });
    if (!user) throw new NotFoundException('user_not_found');
    return transformFlattenUser(user);
  }

  async getAll(filters: FilterUserDTO) {
    const args = getUserArgs(filters);
    return this.prisma.user[firstOrMany(filters.id)](args);
  }

  async getFcmToken(jti: string): Promise<string | undefined> {
    const session = await this.prisma.session.findUnique({
      where: { jti },
      select: { fcmToken: true },
    });
    return session?.fcmToken;
  }

  async count(filters: FilterUserDTO): Promise<number> {
    const args = getUserArgs(filters);
    return this.prisma.user.count({ where: args.where });
  }

  async delete(id: Id): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }
    await this.prisma.user.update({
      where: { id },
      data: {
        email: `deleted_${user.email}_${user.id}`,
      },
    });
    await this.prisma.user.delete({ where: { id } });
  }

  async verify(userId: Id, data: VerifyResetOtpDTO) {
    await this.otpService.verifyOTP(userId, data.otp, OTPType.EMAIL_VERIFICATION);
    await this.prisma.user.update({
      where: { id: userId },
      data: { verified: true },
    });
    const user = await this.getProfile(userId);
    const { token } = await this.tokenService.generateToken(
      user?.id,
      undefined,
      undefined,
      SessionType.ACCESS,
    );
    return { user, token };
  }

  async create(data: CreateUserDTO): Promise<void> {
    await this.helper.userExistOrThrow({ email: data.email });
    const hashedPassword = hashPassword(data.password);
    await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
        roleKey: RolesKeys.CUSTOMER,
      },
      select: { email: true, id: true, name: true },
    });
  }

  async updateCurrentUser(dto: UpdateUserDTO, userId: Id, jti: string): Promise<void> {
    const { fcm, locale, ...data } = dto;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    if (fcm) {
      await this.prisma.session.update({
        where: { jti },
        data: { fcmToken: fcm },
      });
    }

    if (locale) {
      await this.prisma.session.updateMany({
        where: {
          OR: [
            { jti },
            { refreshParentJti: jti },
          ],
        },
        data: { languageId: locale },
      });
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    }
  }

  async updatePassword(id: Id, data: UpdateUserPasswordDTO): Promise<void> {
    const { password, newPassword } = data;
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user_not_found');
    validateUserPassword(password, user.password);
    const hashedPassword = hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
    await this.prisma.session.deleteMany({
      where: { userId: id },
    });
  }

  async getProfile(id: Id, jti?: string): Promise<FlattenedUser> {
    return this.getUser(id, jti);
  }

  async getPermissions(id: Id, jti?: string) {
    const user = await this.getUser(id, jti);
    return user.Permissions;
  }

  async update(id: Id, data: UpdateUserDTO): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('user_not_found');
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateLocale(jti: string, locale: string): Promise<void> {
    await this.prisma.session.update({
      where: { jti },
      data: { languageId: locale },
    });
  }
}
