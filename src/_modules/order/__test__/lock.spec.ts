import { OrderService } from '../services/order.service';
import {
  makeOrder,
  makeProduct,
  makePrisma,
  makeRedisStore,
  buildTx,
  createTestModule,
} from './helpers/order.factory';

describe('Lock lifecycle', () => {
  let service: OrderService;
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedisStore>;

  beforeEach(async () => {
    prisma = makePrisma();
    redis = makeRedisStore();
    const emailQueue = { add: jest.fn().mockResolvedValue(undefined) };
    ({ service } = await createTestModule(prisma, redis, emailQueue));
  });

  it('releases the lock after a successful order creation', async () => {
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(null);

    const order = makeOrder('o-1', 'key-ok', 50);
    const tx = buildTx(makeProduct('prod-1', 5), order);
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await service.create('user-1', { idempotencyKey: 'key-ok', items: [{ productId: 'prod-1', quantity: 1 }] }, 'en');

    expect(redis.del).toHaveBeenCalledWith('lock:idempotency:key-ok');
  });

  it('releases the lock even when the transaction fails', async () => {
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockRejectedValue(new Error('deadlock'));

    await expect(
      service.create('user-1', { idempotencyKey: 'key-fail', items: [{ productId: 'prod-1', quantity: 1 }] }, 'en'),
    ).rejects.toThrow('deadlock');

    expect(redis.del).toHaveBeenCalledWith('lock:idempotency:key-fail');
  });

  it('does not call del when lock was never acquired', async () => {
    redis.set.mockResolvedValue(null);

    await expect(
      service.create('user-1', { idempotencyKey: 'key-busy', items: [{ productId: 'prod-1', quantity: 1 }] }, 'en'),
    ).rejects.toBeDefined();

    expect(redis.del).not.toHaveBeenCalled();
  });
});
