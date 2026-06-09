import { Module } from '@nestjs/common';
import { OpenSearchModule } from 'src/app/_modules/opensearch/opensearch.module';
import { ProductController } from './controllers/product.controller';
import { ProductIndexService } from './services/product.index.service';
import { ProductService } from './services/product.service';

@Module({
  imports: [OpenSearchModule],
  controllers: [ProductController],
  providers: [ProductService, ProductIndexService],
  exports: [ProductService],
})
export class ProductModule {}
