import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { OpenSearchService } from './opensearch.service';

export const OPENSEARCH_CLIENT = 'OPENSEARCH_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: OPENSEARCH_CLIENT,
      useFactory: (configService: ConfigService) => {
        return new Client({
          node: configService.get<string>('OPENSEARCH_URL'),
        });
      },
      inject: [ConfigService],
    },
    OpenSearchService,
  ],
  exports: [OpenSearchService],
})
export class OpenSearchModule {}
