import { getQueueToken } from '@nestjs/bull';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { ClsModule, ClsService } from 'nestjs-cls';
import { RolesKeys } from 'src/_modules/authorization/providers/roles';
import { RedisService } from 'src/app/_modules/redis/redis.service';
import { QueueName } from 'src/app/_modules/worker/worker.constants';
import { PrismaService } from 'src/globals/services/prisma.service';
import { CreateOrderDTO } from '../../dto/create-order.dto';
import { OrderService } from '../../services/order.service';

const prisma = new PrismaClient();

async function createTestCustomerUser() {
  return prisma.user.create({
    data: {
      name: 'Integration Test User',
      email: `test-order-${Date.now()}@integration.test`,
      password: 'hashed',
      roleKey: RolesKeys.CUSTOMER,
      active: true,
      verified: true,
    },
  });
}

async function createTestProduct(stock: number, price: number = 100) {
  return prisma.product.create({
    data: {
      sku: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      name: 'Integration Test Product',
      price,
      stock,
    },
  });
}

describe('OrderService — Integration (real DB + Redis)', () => {
  let service: OrderService;
  let redisClient: Redis;

  let createdOrderIds: string[] = [];
  let createdProductIds: string[] = [];
  let createdUserIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();

    const emailQueue = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        ClsModule.forRoot({ global: true }),
      ],
      providers: [
        OrderService,
        PrismaService,
        RedisService,
        { provide: ClsService, useValue: { get: jest.fn(), set: jest.fn() } },
        { provide: getQueueToken(QueueName.EMAIL), useValue: emailQueue },
      ],
    }).compile();

    await module.init();

    service = module.get<OrderService>(OrderService);
    redisClient = module.get<RedisService>(RedisService).getClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    if (createdOrderIds.length) {
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }
    if (createdProductIds.length) {
      await prisma.product.deleteMany({
        where: { id: { in: createdProductIds } },
      });
    }
    if (createdUserIds.length) {
      await prisma.user.deleteMany({
        where: { id: { in: createdUserIds } },
      });
    }
    createdOrderIds = [];
    createdProductIds = [];
    createdUserIds = [];
  });

  it('creates an order and deducts stock atomically', async () => {
    const user = await createTestCustomerUser();
    const product = await createTestProduct(10, 200);
    createdUserIds.push(user.id);
    createdProductIds.push(product.id);

    const dto: CreateOrderDTO = {
      idempotencyKey: `idem-${Date.now()}`,
      items: [{ productId: product.id, quantity: 3 }],
    };

    const order = await service.create(user.id, dto, 'en');
    createdOrderIds.push(order.id);

    const dbOrder = await prisma.order.findUnique({
      where: { id: order.id },
    });
    expect(dbOrder).not.toBeNull();
    expect(dbOrder.total).toBeCloseTo(600, 1);

    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(dbProduct.stock).toBe(7);

    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
    });
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it('returns the same order on a replayed request', async () => {
    const user = await createTestCustomerUser();
    const product = await createTestProduct(10);
    createdUserIds.push(user.id);
    createdProductIds.push(product.id);

    const dto: CreateOrderDTO = {
      idempotencyKey: `idem-replay-${Date.now()}`,
      items: [{ productId: product.id, quantity: 1 }],
    };

    const first = await service.create(user.id, dto, 'en');
    const second = await service.create(user.id, dto, 'en');
    createdOrderIds.push(first.id);

    expect(first.id).toBe(second.id);

    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(dbProduct.stock).toBe(9);
  });

  it('handles concurrent requests with the same idempotency key — only one succeeds', async () => {
    const user = await createTestCustomerUser();
    const product = await createTestProduct(10);
    createdUserIds.push(user.id);
    createdProductIds.push(product.id);

    const dto: CreateOrderDTO = {
      idempotencyKey: `idem-concurrent-${Date.now()}`,
      items: [{ productId: product.id, quantity: 1 }],
    };

    const results = await Promise.allSettled([
      service.create(user.id, dto, 'en'),
      service.create(user.id, dto, 'en'),
      service.create(user.id, dto, 'en'),
    ]);

    const fulfilled = results.filter(
      (r) => r.status === 'fulfilled',
    ) as PromiseFulfilledResult<any>[];
    const rejected = results.filter(
      (r) => r.status === 'rejected',
    ) as PromiseRejectedResult[];

    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const ids = fulfilled.map((r) => r.value.id);
    expect(new Set(ids).size).toBe(1);
    createdOrderIds.push(ids[0]);

    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(ConflictException);
    }

    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(dbProduct.stock).toBe(9);
  });

  it('prevents overselling when concurrent requests race on different keys', async () => {
    const user = await createTestCustomerUser();
    const product = await createTestProduct(2);
    createdUserIds.push(user.id);
    createdProductIds.push(product.id);

    const dto1: CreateOrderDTO = {
      idempotencyKey: `idem-race-1-${Date.now()}`,
      items: [{ productId: product.id, quantity: 2 }],
    };
    const dto2: CreateOrderDTO = {
      idempotencyKey: `idem-race-2-${Date.now()}`,
      items: [{ productId: product.id, quantity: 2 }],
    };

    const results = await Promise.allSettled([
      service.create(user.id, dto1, 'en'),
      service.create(user.id, dto2, 'en'),
    ]);

    const fulfilled = results.filter(
      (r) => r.status === 'fulfilled',
    ) as PromiseFulfilledResult<any>[];
    const rejected = results.filter(
      (r) => r.status === 'rejected',
    ) as PromiseRejectedResult[];

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    createdOrderIds.push(fulfilled[0].value.id);

    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(dbProduct.stock).toBe(0);
  });

  it('throws NotFoundException for a non-existent product', async () => {
    const user = await createTestCustomerUser();
    createdUserIds.push(user.id);

    const dto: CreateOrderDTO = {
      idempotencyKey: `idem-notfound-${Date.now()}`,
      items: [{ productId: '00000000-0000', quantity: 1 }],
    };

    await expect(service.create(user.id, dto, 'en')).rejects.toThrow(
      NotFoundException,
    );

    const dbOrder = await prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    expect(dbOrder).toBeNull();
  });

  it('throws ConflictException and does not deduct stock when quantity exceeds stock', async () => {
    const user = await createTestCustomerUser();
    const product = await createTestProduct(3);
    createdUserIds.push(user.id);
    createdProductIds.push(product.id);

    const dto: CreateOrderDTO = {
      idempotencyKey: `idem-overflow-${Date.now()}`,
      items: [{ productId: product.id, quantity: 10 }],
    };

    await expect(service.create(user.id, dto, 'en')).rejects.toThrow(
      ConflictException,
    );

    const dbProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(dbProduct.stock).toBe(3);

    const dbOrder = await prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    expect(dbOrder).toBeNull();
  });

  it('creates a multi-item order with correct total and individual stock deductions', async () => {
    const user = await createTestCustomerUser();
    const productA = await createTestProduct(20, 50);
    const productB = await createTestProduct(15, 100);
    createdUserIds.push(user.id);
    createdProductIds.push(productA.id, productB.id);

    const dto: CreateOrderDTO = {
      idempotencyKey: `idem-multi-${Date.now()}`,
      items: [
        { productId: productA.id, quantity: 4 },
        { productId: productB.id, quantity: 2 },
      ],
    };

    const order = await service.create(user.id, dto, 'en');
    createdOrderIds.push(order.id);

    expect(order.total).toBeCloseTo(400, 1);

    const dbA = await prisma.product.findUnique({
      where: { id: productA.id },
    });
    const dbB = await prisma.product.findUnique({
      where: { id: productB.id },
    });
    expect(dbA.stock).toBe(16);
    expect(dbB.stock).toBe(13);

    const items = await prisma.orderItem.findMany({
      where: { orderId: order.id },
    });
    expect(items).toHaveLength(2);
  });
});
