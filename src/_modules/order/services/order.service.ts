import { InjectQueue } from '@nestjs/bull';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { Queue } from 'bull';
import { RedisService } from 'src/app/_modules/redis/redis.service';
import { JobName, QueueName } from 'src/app/_modules/worker/worker.constants';
import { firstOrMany } from 'src/globals/helpers/first-or-many';
import { PrismaService } from 'src/globals/services/prisma.service';
import { CreateOrderDTO } from '../dto/create-order.dto';
import { FilterOrderDTO } from '../dto/filter-order.dto';
import { getOrderArgs } from '../prisma-args/order.prisma-args';
import { selectOrderOBJ } from '../prisma-args/order.prisma-select';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async create(userId: string, dto: CreateOrderDTO, locale: string) {
    const lockAcquired = await this.acquireIdempotencyLock(dto.idempotencyKey);
    if (!lockAcquired) {
      throw new ConflictException(
        'A request with this idempotency key is already in progress',
      );
    }

    try {
      const existingOrder = await this.prisma.order.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        select: selectOrderOBJ(),
      });

      if (existingOrder) {
        return existingOrder;
      }

      const order = await this.prisma.$transaction(async (tx) => {
        const { itemsWithProducts, total } = await this.lockAndDeductStock(
          tx,
          dto.items,
        );

        return tx.order.create({
          data: {
            idempotencyKey: dto.idempotencyKey,
            userId,
            total,
            status: OrderStatus.PENDING,
            Items: {
              create: itemsWithProducts,
            },
          },
          select: selectOrderOBJ(),
        });
      });

      await this.queueOrderEmail(order, locale);

      return order;
    } finally {
      await this.releaseIdempotencyLock(dto.idempotencyKey);
    }
  }

  async getAll(filters: FilterOrderDTO) {
    const args = getOrderArgs(filters);
    return this.prisma.order[firstOrMany(filters.id)](args);
  }

  async count(filters: FilterOrderDTO): Promise<number> {
    const args = getOrderArgs(filters);
    return this.prisma.order.count({ where: args.where });
  }

  private async acquireIdempotencyLock(key: string): Promise<boolean> {
    const redis = this.redisService.getClient();
    const lockKey = `lock:idempotency:${key}`;
    const acquired = await redis.set(lockKey, 'locked', 'PX', 10000, 'NX');
    return !!acquired;
  }

  private async releaseIdempotencyLock(key: string): Promise<void> {
    const redis = this.redisService.getClient();
    await redis.del(`lock:idempotency:${key}`);
  }

  private async lockAndDeductStock(tx: any, items: CreateOrderDTO['items']) {
    const sortedItems = [...items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    );

    const itemsWithProducts = [];
    let total = 0;

    for (const item of sortedItems) {
      const products = await tx.$queryRaw<any[]>`
        SELECT id, sku, name, price, stock
        FROM products
        WHERE id = ${item.productId} AND deleted_at IS NULL
        FOR UPDATE
      `;

      if (!products || products.length === 0) {
        throw new NotFoundException(`Product not found`);
      }

      const product = products[0];

      if (product.stock < item.quantity) {
        throw new ConflictException(
          `Insufficient stock for product NOt Available`,
        );
      }

      await tx.product.update({
        where: { id: product.id },
        data: { stock: product.stock - item.quantity },
      });

      total += product.price * item.quantity;

      itemsWithProducts.push({
        productId: product.id,
        quantity: item.quantity,
        productSnapshot: {
          id: product.id,
          sku: product.sku,
          name: product.name,
          price: product.price,
        },
      });
    }

    return { itemsWithProducts, total };
  }

  private async queueOrderEmail(order: any, locale: string) {
    if (!order) return;

    await this.emailQueue.add(
      JobName.SEND_EMAIL,
      {
        order,
        languageId: locale,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );
  }
}
