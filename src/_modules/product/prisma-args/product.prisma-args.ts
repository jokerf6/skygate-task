import { Prisma } from '@prisma/client';
import { paginateOrNot } from 'src/globals/helpers/pagination-params';
import { filterKey } from 'src/globals/helpers/prisma-filters';
import { FilterProductDTO } from '../dto/filter-product.dto';
import { selectProductOBJ } from './product.prisma-select';

export const getProductArgs = (query: FilterProductDTO) => {
  const { page, limit, sku, minPrice, maxPrice, inStock, id } = query;

  const searchArray: Prisma.ProductWhereInput[] = [];
  if (sku) {
    searchArray.push({ sku: { contains: sku } });
  }

  if (minPrice !== undefined) {
    searchArray.push({ price: { gte: minPrice } });
  }

  if (maxPrice !== undefined) {
    searchArray.push({ price: { lte: maxPrice } });
  }

  if (inStock === true) {
    searchArray.push({ stock: { gt: 0 } });
  } else if (inStock === false) {
    searchArray.push({ stock: { equals: 0 } });
  }

  if (id) {
    const keyFilter = filterKey<any>({ id }, 'id');
    if (keyFilter) {
      searchArray.push(keyFilter);
    }
  }

  return {
    ...paginateOrNot({ limit, page }, id),
    select: selectProductOBJ(),
    where: searchArray.length > 0 ? { AND: searchArray } : {},
  } satisfies Prisma.ProductFindManyArgs;
};
