import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateOrderDTO } from '../dto/create-order.dto';
import { OrderService } from '../services/order.service';
import {
  buildTx,
  createTestModule,
  makeOrder,
  makePrisma,
  makeProduct,
  makeRedisStore,
} from './helpers/order.factory';

const USER_ID = 'user-uuid-1';
const LOCALE = 'en';

const BASE_DTO: CreateOrderDTO = {
  idempotencyKey: 'idem-key-abc',
  items: [{ productId: 'prod-uuid-1', quantity: 2 }],
};

describe('OrderService.create', () => {
  let service: OrderService;
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedisStore>;
  let emailQueue: { add: jest.Mock };

  beforeEach(async () => {
    prisma = makePrisma();
    redis = makeRedisStore();
    emailQueue = { add: jest.fn().mockResolvedValue(undefined) };
    ({ service } = await createTestModule(prisma, redis, emailQueue));
  });

  it('throws ConflictException when idempotency lock is already hold', async () => {
    redis.set.mockResolvedValue(null);

    await expect(service.create(USER_ID, BASE_DTO, LOCALE)).rejects.toThrow(
      ConflictException,
    );

    expect(redis.del).not.toHaveBeenCalled();
  });

  it('returns the existing order when idempotency key is already in the DB', async () => {
    const existing = makeOrder('o-1', BASE_DTO.idempotencyKey, 200);
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(existing);

    const result = await service.create(USER_ID, BASE_DTO, LOCALE);

    expect(result).toEqual(existing);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith(
      `lock:idempotency:${BASE_DTO.idempotencyKey}`,
    );
  });

  it('creates and returns a new order for a valid request', async () => {
    const product = makeProduct('prod-uuid-1', 10, 100);
    const order = makeOrder('o-2', BASE_DTO.idempotencyKey, 200);
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(null);
    const tx = buildTx(product, order);
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const result = await service.create(USER_ID, BASE_DTO, LOCALE);

    expect(result).toEqual(order);
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: product.id },
      data: { stock: 8 },
    });
    expect(emailQueue.add).toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith(
      `lock:idempotency:${BASE_DTO.idempotencyKey}`,
    );
  });

  it('throws NotFoundException when the product does not exist', async () => {
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(null);
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      product: { update: jest.fn() },
      order: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await expect(service.create(USER_ID, BASE_DTO, LOCALE)).rejects.toThrow(
      NotFoundException,
    );
    expect(redis.del).toHaveBeenCalledWith(
      `lock:idempotency:${BASE_DTO.idempotencyKey}`,
    );
  });

  it('throws ConflictException when stock is insufficient', async () => {
    const lowStock = makeProduct('prod-uuid-1', 1, 100);
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(null);
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([lowStock]),
      product: { update: jest.fn() },
      order: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const dto: CreateOrderDTO = {
      ...BASE_DTO,
      items: [{ productId: 'prod-uuid-1', quantity: 5 }],
    };

    await expect(service.create(USER_ID, dto, LOCALE)).rejects.toThrow(
      ConflictException,
    );
    expect(tx.product.update).not.toHaveBeenCalled();
  });

  it('releases the lock even when the transaction throws', async () => {
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockRejectedValue(new Error('DB error'));

    await expect(service.create(USER_ID, BASE_DTO, LOCALE)).rejects.toThrow(
      'DB error',
    );

    expect(redis.del).toHaveBeenCalledWith(
      `lock:idempotency:${BASE_DTO.idempotencyKey}`,
    );
  });

  it('sorts items by productId before locking to avoid deadlocks', async () => {
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(null);

    const productA = makeProduct('aaa', 5);
    const productB = makeProduct('zzz', 5);
    const order = makeOrder('o-3', 'idem-multi', 100);

    const tx = {
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([productA])
        .mockResolvedValueOnce([productB]),
      product: { update: jest.fn().mockResolvedValue(undefined) },
      order: { create: jest.fn().mockResolvedValue(order) },
    };
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const dto: CreateOrderDTO = {
      idempotencyKey: 'idem-multi',
      items: [
        { productId: 'zzz', quantity: 1 },
        { productId: 'aaa', quantity: 1 },
      ],
    };

    await service.create(USER_ID, dto, LOCALE);

    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('skips the email queue when the created order is null', async () => {
    const product = makeProduct('prod-uuid-1', 10, 100);
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(null);
    const tx = buildTx(product, null);
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await service.create(USER_ID, BASE_DTO, LOCALE);

    expect(emailQueue.add).not.toHaveBeenCalled();
  });
});
