import { Prisma } from '@prisma/client';

export const selectProductOBJ = (): Prisma.ProductSelect => {
  return {
    id: true,
    sku: true,
    name: true,
    description: true,
    price: true,
    stock: true,
    image: true,
    createdAt: true,
    deletedAt: true,
  };
};
