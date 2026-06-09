import { OrderService } from '../services/order.service';
import {
  makeOrder,
  makePrisma,
  makeRedisStore,
  createTestModule,
} from './helpers/order.factory';

describe('OrderService.getAll / count', () => {
  let service: OrderService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();
    const redis = makeRedisStore();
    const emailQueue = { add: jest.fn() };
    ({ service } = await createTestModule(prisma, redis, emailQueue));
  });

  describe('getAll', () => {
    it('calls findMany when no id filter is provided', async () => {
      const orders = [makeOrder('o-1', 'k-1', 100), makeOrder('o-2', 'k-2', 200)];
      prisma.order.findMany = jest.fn().mockResolvedValue(orders);

      const result = await service.getAll({} as any);

      expect(prisma.order.findMany).toHaveBeenCalled();
      expect(result).toEqual(orders);
    });

    it('calls findFirst when a single id is provided', async () => {
      const order = makeOrder('o-1', 'k-1', 100);
      prisma.order.findFirst = jest.fn().mockResolvedValue(order);

      const result = await service.getAll({ id: 'o-1' } as any);

      expect(prisma.order.findFirst).toHaveBeenCalled();
      expect(result).toEqual(order);
    });
  });

  describe('count', () => {
    it('returns the number of orders matching the filters', async () => {
      prisma.order.count.mockResolvedValue(7);

      const result = await service.count({} as any);

      expect(result).toBe(7);
      expect(prisma.order.count).toHaveBeenCalled();
    });
  });
});
