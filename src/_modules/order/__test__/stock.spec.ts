import { ConflictException, NotFoundException } from '@nestjs/common';
import { OrderService } from '../services/order.service';
import { CreateOrderDTO } from '../dto/create-order.dto';
import {
  makeOrder,
  makeProduct,
  makePrisma,
  makeRedisStore,
  createTestModule,
} from './helpers/order.factory';

describe('Pessimistic locking — stock integrity', () => {
  let service: OrderService;
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedisStore>;

  beforeEach(async () => {
    prisma = makePrisma();
    redis = makeRedisStore();
    const emailQueue = { add: jest.fn().mockResolvedValue(undefined) };
    ({ service } = await createTestModule(prisma, redis, emailQueue));
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(null);
  });

  it('deducts the correct stock for a single-item order', async () => {
    const product = makeProduct('prod-1', 10, 100);
    const order = makeOrder('o-1', 'k-1', 200);
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([product]),
      product: { update: jest.fn().mockResolvedValue(undefined) },
      order: { create: jest.fn().mockResolvedValue(order) },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await service.create('user-1', { idempotencyKey: 'k-1', items: [{ productId: 'prod-1', quantity: 2 }] }, 'en');

    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { stock: 8 },
    });
  });

  it('deducts stock across multiple line items in sorted order', async () => {
    const productA = makeProduct('aaa-prod', 20, 30);
    const productB = makeProduct('zzz-prod', 15, 70);
    const order = makeOrder('o-2', 'k-2', 230);
    const tx = {
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([productA])
        .mockResolvedValueOnce([productB]),
      product: { update: jest.fn().mockResolvedValue(undefined) },
      order: { create: jest.fn().mockResolvedValue(order) },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const dto: CreateOrderDTO = {
      idempotencyKey: 'k-2',
      items: [
        { productId: 'zzz-prod', quantity: 2 },
        { productId: 'aaa-prod', quantity: 3 },
      ],
    };

    await service.create('user-1', dto, 'en');

    expect(tx.product.update).toHaveBeenCalledTimes(2);
    expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'aaa-prod' }, data: { stock: 17 } });
    expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'zzz-prod' }, data: { stock: 13 } });
  });

  it('rolls back the whole order if one item has insufficient stock', async () => {
    const product = makeProduct('prod-1', 2);
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([product]),
      product: { update: jest.fn() },
      order: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(
      service.create('user-1', { idempotencyKey: 'k-3', items: [{ productId: 'prod-1', quantity: 10 }] }, 'en'),
    ).rejects.toThrow(ConflictException);

    expect(tx.product.update).not.toHaveBeenCalled();
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('rejects when the product is soft-deleted (filtered by deleted_at IS NULL)', async () => {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      product: { update: jest.fn() },
      order: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(
      service.create('user-1', { idempotencyKey: 'k-4', items: [{ productId: 'gone', quantity: 1 }] }, 'en'),
    ).rejects.toThrow(NotFoundException);
  });
});
