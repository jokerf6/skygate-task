import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { firstOrMany } from 'src/globals/helpers/first-or-many';
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
  ) {}

  async create(dto: CreateProductDTO) {
    try {
      const product = await this.prisma.product.create({
        data: dto,
        select: selectProductOBJ(),
      });

      this.productIndex.indexProduct(product).catch(() => void 0);

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

    const args = getProductArgs(filters);
    return this.prisma.product[firstOrMany(filters.id)](args);
  }

  async count(filters: FilterProductDTO): Promise<number> {
    const args = getProductArgs(filters);
    return this.prisma.product.count({ where: args.where });
  }

  async getOne(id: Id) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: selectProductOBJ(),
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
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

    this.productIndex.indexProduct(product).catch(() => void 0);

    return product;
  }

  async delete(id: Id): Promise<void> {
    await this.prisma.product.delete({ where: { id } });

    this.productIndex.removeProduct(id).catch(() => void 0);
  }

  private async openSearch(search: string) {
    const matchedIds = await this.productIndex.searchProducts(search);

    if (!matchedIds.length) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: matchedIds } },
      select: selectProductOBJ(),
    });

    const idIndex = new Map(matchedIds.map((id, pos) => [id, pos]));
    return products.sort(
      (a, b) => (idIndex.get(a.id) ?? 0) - (idIndex.get(b.id) ?? 0),
    );
  }
}
