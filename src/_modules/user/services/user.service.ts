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
  EnableBioDTO,
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
    private prisma: PrismaService,
    private Token: TokenService,
    private OTP: OTPService,
    private helper: HelperService,
  ) {}

  async getUser(userId: Id, jti: string) {
    const selectObj = selectUserWithRoleAndPermissionsOBJ(jti);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: selectObj,
    });
    const flattenUser = transformFlattenUser(user);

    return flattenUser;
  }

  async getAll(filters: FilterUserDTO) {
    const args = getUserArgs(filters);
    const users = await this.prisma.user[firstOrMany(filters.id)](args);
    return users;
  }
  async getFcmToken(jti: string) {
    const session = await this.prisma.session.findUnique({
      where: { jti },
      select: { fcmToken: true },
    });

    return session?.fcmToken;
  }
  async count(filters: FilterUserDTO) {
    const args = getUserArgs(filters);
    return this.prisma.user.count({ where: args.where });
  }

  async delete(id: Id) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }
    await this.prisma.user.update({
      where: { id },
      data: {
        phone: `deleted_${user.phone}_${user.id}`,
        email: `deleted_${user.email}_${user.id}`,
      },
    });
    await this.prisma.user.delete({ where: { id } });
  }

  async verify(userId: Id, data: VerifyResetOtpDTO) {
    await this.OTP.verifyOTP(userId, data.otp, OTPType.EMAIL_VERIFICATION);
    await this.prisma.user.update({
      where: { id: userId },
      data: { verified: true },
    });
    const user = await this.getProfile(userId);
    const { token } = await this.Token.generateToken(
      user?.user?.id,
      undefined,
      undefined,
      SessionType.ACCESS,
    );
    return { user, token };
  }

  async create(data: CreateUserDTO) {
    await this.helper.userExistOrThrow({
      email: data.email,
    });

    const hashedPassword = hashPassword(data.password);
    data.password = hashedPassword;
    data.roleKey = RolesKeys.CUSTOMER;
    await this.prisma.user.create({
      data,
      select: { email: true, id: true, name: true },
    });
  }

  async updateCurrentUser(dto: UpdateUserDTO, userId: Id, jti: string) {
    const { fcm, locale, ...data } = dto;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (fcm) {
      await this.prisma.session.update({
        where: {
          jti,
        },
        data: {
          fcmToken: fcm,
        },
      });
    }
    if (locale) {
      await this.prisma.session.updateMany({
        where: {
          OR: [
            {
              jti,
            },
            {
              refreshParentJti: jti,
            },
          ],
        },
        data: {
          languageId: locale,
        },
      });
    }
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
      },
    });
  }

  async enableBio(userId: Id, dto: EnableBioDTO) {
    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        deviceId: dto.deviceId,
      },
    });
  }
  async updatePassword(id: Id, data: UpdateUserPasswordDTO) {
    const { password, newPassword } = data;
    const user = await this.prisma.user.findUnique({ where: { id } });
    validateUserPassword(password, user.password);
    const hashedPassword = hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });
    await this.prisma.session.deleteMany({
      where: { userId: id },
    });
  }

  async getProfile(id, jti?: string) {

    const user = await this.getUser(id, jti);
    return user;
  }

  async getPermissions(id: Id, jti?: string) {
    const user: FlattenedUser = await this.getUser(id, jti);
    return user.Permissions;
  }

  async update(id: Id, data: UpdateUserDTO) {
    await this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateLocale(jti: string, locale: string) {
    await this.prisma.session.update({
      where: { jti },
      data: { languageId: locale },
    });
  }
}

