import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {  PrismaClient } from '@prisma/client';
import { RolesKeys } from 'src/_modules/authorization/providers/roles';
import { validatePermissions } from '../helpers/validatePermissions.helper';
import { PrismaService } from './prisma.service';

@Injectable()
export class GlobalHelpers {
  constructor(private prisma: PrismaService) {}
  async canUserAccessResource(
    user: CurrentUser,
    modelName: keyof PrismaClient,
    prefix: string,
    resourceId: Id,
    ownerFieldName: string = 'userId',
    ownerCurrentUserField: string = 'id',
    indirectRelation?: boolean,
  ) {
    if (user?.Role?.roleKey === RolesKeys.ADMIN) return true;
    const resource = await this.prisma[modelName as string].findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }
    const hasPermission = validatePermissions(
      `${prefix}_manage`,
      user.permissions as any[],
    );

    if (
      resource?.[ownerFieldName] !== user?.[ownerCurrentUserField] &&
      !hasPermission &&
      !indirectRelation
    ) {
      throw new ForbiddenException('You do not have access to this resource');
    }
    if (indirectRelation) {
      const userModel = await this.prisma.user.findUnique({
        where: {
          id: user.id,
        },
      });
      if (!userModel) {
        throw new ForbiddenException('You do not have access to this resource');
      }
      if (userModel?.[`${String(modelName)}Id`] !== resourceId) {
        throw new ForbiddenException('You do not have access to this resource');
      }
    }

    return true;
  }
 
 
}
