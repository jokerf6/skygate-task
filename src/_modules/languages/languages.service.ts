import { BadRequestException, Injectable } from '@nestjs/common';
import * as path from 'path';
import { firstOrMany } from 'src/globals/helpers/first-or-many';
import { copyAndRenameFolder } from 'src/globals/helpers/folder.helper';
import { PrismaService } from 'src/globals/services/prisma.service';
import { MediaService } from '../media/services/media.service';
import { LanguagesCacheService } from './services/languages-cache.service';
import {
  CreateLanguagesDTO,
  FilterLanguagesDTO,
  UpdateLanguagesDTO,
} from './dto/languages.dto';
import {
  getLanguagesArgs,
  getLanguagesArgsWithSelect,
} from './prisma-args/languages.prisma.args';

@Injectable()
export class LanguagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly cache: LanguagesCacheService,
  ) {}

  async create(data: CreateLanguagesDTO) {
    await this.prisma.language.create({
      data,
    });
    await this.cache.invalidate();
  }

  async update(body: UpdateLanguagesDTO) {
    await this.prisma.language.update({ where: { key: body.key }, data: body });
    await this.cache.invalidate();
  }

  async findAll(filters: FilterLanguagesDTO) {
    return this.cache.remember(
      'findAll',
      filters ?? {},
      async () => {
        const args = getLanguagesArgs(filters);
        const argsWithSelect = getLanguagesArgsWithSelect();

        return this.prisma.language[firstOrMany(filters?.key)]({
          ...argsWithSelect,
          ...args,
        });
      },
    );
  }

  async count(filters: FilterLanguagesDTO) {
    return this.cache.remember(
      'count',
      filters ?? {},
      async () => {
        const args = getLanguagesArgs(filters);
        return this.prisma.language.count({
          where: args.where,
        });
      },
    );
  }
  async delete(key: string): Promise<void> {
    if (key === 'en')
      throw new BadRequestException('Cannot delete default language');
    await this.prisma.language.delete({
      where: {
        key,
      },
    });
    await this.cache.invalidate();
  }

  async handelFile(body: CreateLanguagesDTO | UpdateLanguagesDTO) {
    const dir = path.join(__dirname, '../../../..');

    const file = `${env('TEMP_FILE_KEY')}${body.file.split('/').pop()}`;
    const allExist = await this.media.checkAllKeysExist(
      `${dir}/i18n/en/response.json`,
      `${dir}/uploads/i18n/${file}`,
    );
    if (!allExist) throw new BadRequestException('file not matching all keys');
    await copyAndRenameFolder(
      `${dir}/i18n/en`,
      `${dir}/i18n`,
      body.key.toLowerCase(),
    );
    await this.media.copyFileContent(
      `${dir}/uploads/i18n/${file}`,
      `${dir}/i18n/${body.key.toLowerCase()}/response.json`,
    );
  }
  async getCashedLanguages() {
    return this.findAll({});
  }
}
