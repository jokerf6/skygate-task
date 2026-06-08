import { Injectable, NotFoundException } from '@nestjs/common';
import { firstOrMany } from 'src/globals/helpers/first-or-many';
import { hashPassword } from 'src/globals/helpers/password.helpers';
import { PrismaService } from '../../../globals/services/prisma.service';
import { UpdateUserDTO, UpdateUserPasswordDTO } from '../dto/create.user.dto';
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

  async count(filters: FilterUserDTO): Promise<number> {
    const args = getUserArgs(filters);
    return this.prisma.user.count({ where: args.where });
  }

  async delete(id: Id): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async updateCurrentUser(
    dto: UpdateUserDTO,
    userId: Id,
    jti: string,
  ): Promise<void> {
    const { locale, ...data } = dto;
    await this.helper.userExist({ id: userId });
    if (locale) {
      await this.prisma.session.updateMany({
        where: {
          OR: [{ jti }, { refreshParentJti: jti }],
        },
        data: { languageId: locale },
      });
    }

    await this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updatePassword(id: Id, data: UpdateUserPasswordDTO): Promise<void> {
    const { password, newPassword } = data;
    await this.helper.userExist({ id, password });
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
    await this.helper.userExist({ id });
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
