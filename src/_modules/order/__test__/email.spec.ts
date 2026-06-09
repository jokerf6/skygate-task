import { OrderService } from '../services/order.service';
import {
  buildTx,
  createTestModule,
  makeOrder,
  makePrisma,
  makeProduct,
  makeRedisStore,
} from './helpers/order.factory';

describe('Email notification — queue dispatch', () => {
  let service: OrderService;
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedisStore>;
  let emailQueue: { add: jest.Mock };

  beforeEach(async () => {
    prisma = makePrisma();
    redis = makeRedisStore();
    emailQueue = { add: jest.fn().mockResolvedValue(undefined) };
    ({ service } = await createTestModule(prisma, redis, emailQueue));
    redis.set.mockResolvedValue('OK');
    prisma.order.findUnique.mockResolvedValue(null);
  });

  it('queues an email job with exponential backoff after a successful order', async () => {
    const order = makeOrder('o-1', 'key-1', 100);
    const tx = buildTx(makeProduct('prod-1', 5), order);
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await service.create(
      'user-1',
      {
        idempotencyKey: 'key-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
      },
      'en',
    );

    expect(emailQueue.add).toHaveBeenCalledWith(
      'send_email',
      { order, languageId: 'en' },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );
  });

  it('does not queue an email when the created order is null', async () => {
    const tx = buildTx(makeProduct('prod-1', 5), null);
    prisma.$transaction.mockImplementation((cb: any) => cb(tx));

    await service.create(
      'user-1',
      {
        idempotencyKey: 'key-2',
        items: [{ productId: 'prod-1', quantity: 1 }],
      },
      'en',
    );

    expect(emailQueue.add).not.toHaveBeenCalled();
  });
});
