import { InjectQueue } from '@nestjs/bull';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Queue } from 'bull';
import { RedisService } from 'src/app/_modules/redis/redis.service';
import { JobName, QueueName } from 'src/app/_modules/worker/worker.constants';
import { firstOrMany, isOne } from 'src/globals/helpers/first-or-many';
import { PrismaService } from 'src/globals/services/prisma.service';
import { CreateProductDTO } from '../dto/create-product.dto';
import { FilterProductDTO } from '../dto/filter-product.dto';
import { UpdateProductDTO } from '../dto/update-product.dto';
import { getProductArgs } from '../prisma-args/product.prisma-args';
import { selectProductOBJ } from '../prisma-args/product.prisma-select';
import { ProductIndexService } from './product.index.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productIndex: ProductIndexService,
    @InjectQueue(QueueName.PRODUCT_INDEX) private readonly indexQueue: Queue,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateProductDTO) {
    try {
      const product = await this.prisma.product.create({
        data: dto,
        select: selectProductOBJ(),
      });

      await this.indexQueue.add(JobName.INDEX_PRODUCT, product);
      await this.clearSearchCache();

      return product;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Product with this SKU already exists');
      }
      throw error;
    }
  }

  async getAll(filters: FilterProductDTO) {
    if (filters.search) return this.openSearch(filters.search);

    if (isOne(filters.id)) {
      const cached = await this.getCachedProduct(filters.id);
      if (cached) return cached;
    }

    const args = getProductArgs(filters);
    const result = await this.prisma.product[firstOrMany(filters.id)](args);

    if (isOne(filters.id) && result) {
      this.trackProductView(filters.id, result);
    }

    return result;
  }

  async count(filters: FilterProductDTO): Promise<number> {
    const args = getProductArgs(filters);
    return this.prisma.product.count({ where: args.where });
  }

  async getOne(id: Id) {
    const cached = await this.getCachedProduct(id);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { id },
      select: selectProductOBJ(),
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    this.trackProductView(id, product);

    return product;
  }

  async update(id: Id, dto: UpdateProductDTO) {
    const product = await this.prisma.$transaction(async (tx) => {
      const lockedProducts = await tx.$queryRaw<any[]>`
        SELECT id, sku, price, stock FROM products WHERE id = ${id} AND deleted_at IS NULL FOR UPDATE
      `;

      if (!lockedProducts || lockedProducts.length === 0) {
        throw new NotFoundException('Product not found');
      }
      return tx.product.update({
        where: { id },
        data: dto,
        select: selectProductOBJ(),
      });
    });

    await this.indexQueue.add(JobName.INDEX_PRODUCT, product);
    await this.clearProductCache(id);
    await this.clearSearchCache();

    return product;
  }

  async delete(id: Id): Promise<void> {
    await this.prisma.product.delete({ where: { id } });

    await this.indexQueue.add(JobName.REMOVE_PRODUCT, { id });

    await this.redisService.getClient().zrem('products:views', id);
    await this.clearProductCache(id);
    await this.clearSearchCache();
  }

  private async getCachedProduct(id: string): Promise<any | null> {
    const cached = await this.redisService.get(`product:cache:${id}`);
    if (cached) {
      this.trackProductView(id);
      return JSON.parse(cached);
    }
    return null;
  }

  private trackProductView(id: string, productToCache?: any) {
    const redis = this.redisService.getClient();
    redis
      .zincrby('products:views', 1, id)
      .then(async () => {
        if (productToCache) {
          const rank = await redis.zrevrank('products:views', id);
          if (rank !== null && rank < 100) {
            await this.redisService.set(
              `product:cache:${id}`,
              JSON.stringify(productToCache),
              3600,
            );
          }
        }
      })
      .catch(() => void 0);
  }

  private async clearProductCache(id: string) {
    await this.redisService.del(`product:cache:${id}`);
  }

  private async clearSearchCache() {
    const redis = this.redisService.getClient();
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        'product:search:*',
        'COUNT',
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  private async openSearch(search: string) {
    const cacheKey = `product:search:${search.trim().toLowerCase()}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const matchedIds = await this.productIndex.searchProducts(search);
    if (!matchedIds.length) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: matchedIds } },
      select: selectProductOBJ(),
    });

    const idIndex = new Map(matchedIds.map((id, pos) => [id, pos]));
    const sortedProducts = products.sort(
      (a, b) => (idIndex.get(a.id) ?? 0) - (idIndex.get(b.id) ?? 0),
    );

    await this.redisService.set(cacheKey, JSON.stringify(sortedProducts), 300);

    return sortedProducts;
  }
}
