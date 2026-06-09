import { OrderStatus } from '@prisma/client';
import { getQueueToken } from '@nestjs/bull';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/globals/services/prisma.service';
import { RedisService } from 'src/app/_modules/redis/redis.service';
import { QueueName } from 'src/app/_modules/worker/worker.constants';
import { OrderService } from '../../services/order.service';

export function makeProduct(id: string, stock: number, price = 50) {
  return { id, sku: `SKU-${id}`, name: `Product ${id}`, price, stock };
}

export function makeOrder(id: string, idempotencyKey: string, total: number) {
  return {
    id,
    invoiceNumber: 1,
    idempotencyKey,
    status: OrderStatus.PENDING,
    total,
    userId: 'user-1',
    createdAt: new Date(),
    deletedAt: null,
    Items: [],
    User: { id: 'user-1', name: 'Test', email: 'test@example.com' },
  };
}

export function makeRedisStore() {
  const store = new Map<string, string>();
  return {
    set: jest.fn(async (key: string, _val: string, _px: string, _ttl: number, mode: string) => {
      if (mode === 'NX' && store.has(key)) return null;
      store.set(key, _val);
      return 'OK';
    }),
    del: jest.fn(async (key: string) => {
      store.delete(key);
      return 1;
    }),
    store,
  };
}

export function buildTx(product: ReturnType<typeof makeProduct>, order: any) {
  return {
    $queryRaw: jest.fn().mockResolvedValue([product]),
    product: { update: jest.fn().mockResolvedValue(undefined) },
    order: { create: jest.fn().mockResolvedValue(order) },
  };
}

export function makePrisma() {
  return {
    order: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

export async function createTestModule(
  prisma: any,
  redisClient: any,
  emailQueue: any,
): Promise<{ service: OrderService; module: TestingModule }> {
  const module = await Test.createTestingModule({
    providers: [
      OrderService,
      { provide: PrismaService, useValue: prisma },
      { provide: RedisService, useValue: { getClient: () => redisClient } },
      { provide: getQueueToken(QueueName.EMAIL), useValue: emailQueue },
    ],
  }).compile();

  return { service: module.get<OrderService>(OrderService), module };
}
