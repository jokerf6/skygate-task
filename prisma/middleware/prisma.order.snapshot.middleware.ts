import { Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

type ProductSnapshot = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
};

type OrderItemData = Record<string, any>;

function buildInvoiceNumber(): string {
  return `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

function extractProductLookup(data: OrderItemData): {
  id?: string;
  sku?: string;
} {
  const productId = data.productId || data.product_id;
  const productConnect = data.product?.connect || data.product?.Connect;

  return {
    id: productId || productConnect?.id,
    sku: productConnect?.sku,
  };
}

async function resolveProductSnapshot(
  prisma: PrismaClient,
  data: OrderItemData,
): Promise<ProductSnapshot | null> {
  const lookup = extractProductLookup(data);

  if (lookup.id) {
    const product = await prisma.product.findUnique({
      where: { id: lookup.id },
    });

    if (!product) {
      return null;
    }

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description ?? null,
      image: product.image ?? null,
      price: product.price,
    };
  }

  if (lookup.sku) {
    const product = await prisma.product.findUnique({
      where: { sku: lookup.sku },
    });

    if (!product) {
      return null;
    }

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description ?? null,
      image: product.image ?? null,
      price: product.price,
    };
  }

  return null;
}

export function orderSnapshotMiddleware(
  prisma: PrismaClient,
): Prisma.Middleware {
  return async (params, next) => {
    if (!params.model) {
      return next(params);
    }



    if (params.model === 'Order' && params.action === 'create') {
      params.args.data = {
        ...params.args.data,
        invoiceNumber: params.args.data?.invoiceNumber ?? buildInvoiceNumber(),
      };
    }

    if (
      params.model === 'OrderItem' &&
      ['create', 'createMany'].includes(params.action)
    ) {
      for (const item of params.args.data) {
        const snapshot = await resolveProductSnapshot(prisma, item);
        item.productSnapshot = snapshot;
      }
    }

    return next(params);
  };
}
