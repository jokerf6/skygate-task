import { Inject, Injectable, Logger } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { OPENSEARCH_CLIENT } from './opensearch.constants';

@Injectable()
export class OpenSearchService {
  private readonly logger = new Logger(OpenSearchService.name);
  constructor(@Inject(OPENSEARCH_CLIENT) private readonly client: Client) {}

  async indexDocument(
    index: string,
    id: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.client.index({ index, id, body });
    } catch (error) {
      this.logger.error(`Failed to index document ${id} in [${index}]`, error);
    }
  }

  async deleteDocument(index: string, id: string): Promise<void> {
    try {
      await this.client.delete({ index, id });
    } catch (error) {
      if (error?.meta?.statusCode !== 404) {
        this.logger.error(
          `Failed to delete document ${id} from [${index}]`,
          error,
        );
      }
    }
  }

  async search(
    index: string,
    query: Record<string, unknown>,
    size = 100,
  ): Promise<string[]> {
    try {
      const response = await this.client.search({
        index,
        body: { query, size },
      });
      const hits = response.body?.hits?.hits ?? [];
      return hits.map((hit: { _id: string }) => hit._id);
    } catch (error) {
      if (error?.meta?.statusCode === 404) return [];
      this.logger.error(`Search failed in [${index}]`, error);
      return [];
    }
  }

  async ensureIndex(
    index: string,
    mappings: Record<string, unknown>,
  ): Promise<void> {
    try {
      const exists = await this.client.indices.exists({ index });
      if (!exists.body) {
        await this.client.indices.create({ index, body: { mappings } });
        this.logger.log(`Created OpenSearch index: ${index}`);
      }
    } catch (error) {
      this.logger.error(`Failed to ensure index [${index}]`, error);
    }
  }
}
