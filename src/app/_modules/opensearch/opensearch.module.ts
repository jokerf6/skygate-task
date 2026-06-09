import { Global, Module } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { OPENSEARCH_CLIENT } from './opensearch.constants';
import { OpenSearchService } from './opensearch.service';

@Global()
@Module({
  providers: [
    {
      provide: OPENSEARCH_CLIENT,
      useFactory: () => new Client({ node: env('OPENSEARCH_URL') }),
    },
    OpenSearchService,
  ],
  exports: [OpenSearchService],
})
export class OpenSearchModule {}
