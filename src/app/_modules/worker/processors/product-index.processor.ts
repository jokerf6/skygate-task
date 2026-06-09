import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Product } from '@prisma/client';
import { ProductIndexService } from 'src/_modules/product/services/product.index.service';
import { JobName, QueueName } from '../worker.constants';

@Processor(QueueName.PRODUCT_INDEX)
export class ProductIndexProcessor {
  constructor(private readonly productIndex: ProductIndexService) {}

  @Process(JobName.INDEX_PRODUCT)
  async handleIndex(job: Job<Product>) {
    await this.productIndex.indexProduct(job.data);
  }

  @Process(JobName.REMOVE_PRODUCT)
  async handleRemove(job: Job<{ id: string }>) {
    await this.productIndex.removeProduct(job.data.id);
  }
}
