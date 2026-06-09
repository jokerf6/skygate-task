import { Prisma, PrismaClient } from '@prisma/client';

export function skuMiddleware(prisma: PrismaClient): Prisma.Middleware {
  return async (params, next) => {
    if (params.model === 'Product') {
      if (params.action === 'create') {
        const data = params.args?.data;
        if (data && (!data.sku || data.sku.trim() === '')) {
          data.sku = await generateUniqueSku(prisma);
        }
      } else if (params.action === 'createMany') {
        const dataList = params.args?.data;
        if (Array.isArray(dataList)) {
          for (const data of dataList) {
            if (!data.sku || data.sku.trim() === '') {
              data.sku = await generateUniqueSku(prisma);
            }
          }
        }
      }
    }
    return next(params);
  };
}

async function generateUniqueSku(prisma: PrismaClient): Promise<string> {
  let sku = '';
  let isUnique = false;

  while (!isUnique) {
    sku = `PROD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const exists = await prisma.product.findUnique({
      where: { sku },
    });
    if (!exists) {
      isUnique = true;
    }
  }

  return sku;
}
