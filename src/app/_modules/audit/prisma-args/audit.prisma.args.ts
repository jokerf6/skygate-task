import { Prisma, User } from '@prisma/client';
import { paginateOrNot } from 'src/globals/helpers/pagination-params';
import {
  containsInFields,
  filterKey,
} from 'src/globals/helpers/prisma-filters';
import { FilterAuditDTO } from '../dto/filter.audit.dto';

export const getAuditArgs = (query: FilterAuditDTO) => {
  const { page, limit, ...filter } = query;
  const searchArray = [
    containsInFields(['entityName'], filter?.entityName),
    containsInFields(['entityId'], filter?.entityId),
  ]
    .filter((x) => x)
    .flat();

  return {
    ...paginateOrNot({ limit, page }, query?.id),
    where: {
      AND: searchArray,
    },
  } satisfies Prisma.AuditLogFindManyArgs;
};
