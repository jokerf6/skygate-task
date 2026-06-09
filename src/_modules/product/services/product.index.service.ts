import { Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, Product } from '@prisma/client';
import { LanguagesService } from 'src/_modules/languages/languages.service';
import { OpenSearchService } from 'src/app/_modules/opensearch/opensearch.service';

export const PRODUCTS_INDEX = 'products';

const LOCALE_ANALYZER: Record<string, string> = {
  ar: 'arabic',
  en: 'english',
  fr: 'french',
  de: 'german',
  es: 'spanish',
};

@Injectable()
export class ProductIndexService implements OnModuleInit {
  constructor(
    private readonly openSearch: OpenSearchService,
    private readonly languages: LanguagesService,
  ) {}

  async onModuleInit() {
    const locales = await this.getLocales();

    const properties: Record<string, unknown> = {
      sku: { type: 'keyword' },
      price: { type: 'float' },
      stock: { type: 'integer' },
    };

    for (const locale of locales) {
      const analyzer = LOCALE_ANALYZER[locale] ?? 'standard';
      properties[`name_${locale}`] = { type: 'text', analyzer };
      properties[`description_${locale}`] = { type: 'text', analyzer };
    }

    await this.openSearch.ensureIndex(PRODUCTS_INDEX, { properties });
  }

  async indexProduct(product: Product): Promise<void> {
    const locales = await this.getLocales();

    const doc: Record<string, unknown> = {
      sku: product.sku,
      price: product.price,
      stock: product.stock,
    };

    for (const locale of locales) {
      doc[`name_${locale}`] = this.pick(product.name, locale);
      doc[`description_${locale}`] = this.pick(product.description, locale);
    }

    await this.openSearch.indexDocument(PRODUCTS_INDEX, product.id, doc);
  }

  async removeProduct(id: string): Promise<void> {
    await this.openSearch.deleteDocument(PRODUCTS_INDEX, id);
  }

  async searchProducts(term: string): Promise<string[]> {
    const locales = await this.getLocales();

    const fields = locales.flatMap((locale) => [
      `name_${locale}^3`,
      `description_${locale}`,
    ]);

    return this.openSearch.search(PRODUCTS_INDEX, {
      multi_match: {
        query: term,
        fields,
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });
  }

  private async getLocales(): Promise<string[]> {
    const languages = await this.languages.getCashedLanguages();
    return (languages as { key: string }[]).map((l) => l.key);
  }

  private pick(
    json: Prisma.JsonValue | null | undefined,
    locale: string,
  ): string {
    if (!json) return '';
    const val = json[locale];
    return typeof val === 'string' ? val : '';
  }
}
