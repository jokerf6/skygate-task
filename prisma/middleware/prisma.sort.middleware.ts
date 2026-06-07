import { Prisma } from '@prisma/client';

export function sortMiddleware<
  T extends Prisma.BatchPayload = Prisma.BatchPayload,
>(): Prisma.Middleware {
  return async (
    params: Prisma.MiddlewareParams,
    next: (params: Prisma.MiddlewareParams) => Promise<T>,
  ): Promise<T> => {
    const dateFields = Prisma.dmmf?.datamodel?.models
      ?.find((m) => m?.name === params?.model)
      ?.fields?.filter((field) => Boolean(field?.name?.endsWith('At')));

    const modelHasCreatedAt =
      dateFields?.some((field) => field?.name === 'createdAt') ?? false;

    if (params.action === 'findMany' && modelHasCreatedAt) {
      const existingOrderBy = params.args?.orderBy;
      let newOrderBy;

      if (!existingOrderBy) {
        newOrderBy = { createdAt: 'desc' };
      } else if (Array.isArray(existingOrderBy)) {
        const hasCreatedAtOrder = existingOrderBy.some(
          (order) => order?.createdAt !== undefined,
        );
        if (!hasCreatedAtOrder) {
          newOrderBy = [...existingOrderBy, { createdAt: 'desc' }];
        } else {
          newOrderBy = existingOrderBy;
        }
      } else {
        if (!existingOrderBy?.createdAt) {
          newOrderBy = [existingOrderBy, { createdAt: 'desc' }];
        } else {
          newOrderBy = existingOrderBy;
        }
      }

      params.args = {
        ...params.args,
        orderBy: newOrderBy,
      };
    }

    return next(params);
  };
}
