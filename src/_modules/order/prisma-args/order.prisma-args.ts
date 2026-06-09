import { Prisma } from '@prisma/client';
import { paginateOrNot } from 'src/globals/helpers/pagination-params';
import { FilterOrderDTO } from '../dto/filter-order.dto';
import { selectOrderOBJ } from './order.prisma-select';

export const getOrderArgs = (query: FilterOrderDTO, userId?: string) => {
  const { page, limit, status, startDate, endDate, minTotal, id } = query;

  const searchArray: Prisma.OrderWhereInput[] = [];

  if (userId) {
    searchArray.push({ userId });
  }

  if (status) {
    searchArray.push({ status });
  }

  if (startDate) {
    searchArray.push({ createdAt: { gte: new Date(startDate) } });
  }

  if (endDate) {
    searchArray.push({ createdAt: { lte: new Date(endDate) } });
  }

  if (minTotal !== undefined) {
    searchArray.push({ total: { gte: minTotal } });
  }

  if (id) {
    searchArray.push({ id });
  }

  return {
    ...paginateOrNot({ limit, page }, id),
    select: selectOrderOBJ(),
    where: searchArray.length > 0 ? { AND: searchArray } : {},
    orderBy: { createdAt: 'desc' },
  } satisfies Prisma.OrderFindManyArgs;
};
