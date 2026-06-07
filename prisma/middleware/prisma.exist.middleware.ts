import { NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export function ExistMiddleware(prisma: PrismaClient): Prisma.Middleware {
  return async (params, next) => {
    if (
      !params?.args?.select?.Sessions &&
      ['update', 'delete'].includes(params.action)
    ) {
      const modelName = params.model as keyof PrismaClient;
      const modelDelegate = prisma[modelName] as any;
      const exists = await modelDelegate.findUnique({
        where: params.args.where,
      });
      if (!exists || (exists.deletedAt && exists.deletedAt !== null)) {
        throw new NotFoundException(
          `*${Object.keys(params.args.where)[0]}* 0EXIST0`,
        );
      }
    }
    return next(params);
  };
}
