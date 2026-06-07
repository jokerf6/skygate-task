import { Injectable } from '@nestjs/common';
import { grouped } from 'src/_modules/user/helpers/auth.groupBy.helper';
import { PrismaService } from 'src/globals/services/prisma.service';
import { UpdatePermissionDTO } from '../dto/permission.dto';
import { RolesKeys } from '../providers/roles';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  async get(user: CurrentUser) {
    return grouped(
      await this.prisma.permission.findMany({
        where: {
          RolePermission: {
        some:{
          roleId:user.Role.roleKey!==RolesKeys.ADMIN?user.Role.id:undefined
        }
          },
        },
      }),
    );
  }

  async update(id: Id, data: UpdatePermissionDTO) {
    await this.prisma.permission.update({ where: { id }, data });
  }
}
