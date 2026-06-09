import { ConflictException } from '@nestjs/common';
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

describe('Idempotency — duplicate request handling', () => {
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

  it('returns the same order for two concurrent requests sharing a key (DB hit)', async () => {
    const existing = makeOrder('order-1', 'key-1', 100);
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(existing);

    const dto: CreateOrderDTO = {
      idempotencyKey: 'key-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
    };

    const [first, second] = await Promise.all([
      service.create('user-1', dto, 'en'),
      service.create('user-1', dto, 'en'),
    ]);

    expect(first).toEqual(existing);
    expect(second).toEqual(existing);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects the second concurrent request via Redis NX lock', async () => {
    let calls = 0;
    redis.set.mockImplementation(async () => (++calls === 1 ? 'OK' : null));

    const order = makeOrder('order-2', 'key-2', 50);
    prisma.order.findUnique.mockResolvedValue(null);
    const tx = buildTx(makeProduct('prod-1', 10), order);
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    const dto: CreateOrderDTO = {
      idempotencyKey: 'key-2',
      items: [{ productId: 'prod-1', quantity: 1 }],
    };

    const results = await Promise.allSettled([
      service.create('user-1', dto, 'en'),
      service.create('user-1', dto, 'en'),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(
      (r) => r.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
  });
});
