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

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDTO) {
    try {
      return await this.prisma.product.create({
        data: dto,
        select: selectProductOBJ(),
      });
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
    return this.prisma.$transaction(async (tx) => {
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
  }

  async delete(id: Id): Promise<void> {
    await this.prisma.product.delete({ where: { id } });
  }
}
