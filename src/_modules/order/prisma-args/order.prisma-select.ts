import { Prisma } from '@prisma/client';

export const selectOrderOBJ = (): Prisma.OrderSelect => {
  return {
    id: true,
    invoiceNumber: true,
    idempotencyKey: true,
    status: true,
    total: true,
    userId: true,
    createdAt: true,
    deletedAt: true,
    Items: {
      select: {
        id: true,
        productId: true,
        productSnapshot: true,
        quantity: true,
        createdAt: true,
      },
    },
    User: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
  };
};
