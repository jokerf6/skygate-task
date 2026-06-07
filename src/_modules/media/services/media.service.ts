import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MediaService {
  constructor() {}
  async isMediaExist(media: string) {
    if (!fs.existsSync(`${env('UPLOADS_PATH')}/${media}`)) {
      throw new NotFoundException('notFound');
    }
    if (!fs.statSync(`${env('UPLOADS_PATH')}/${media}`).isFile())
      throw new NotFoundException('notFound');
  }

  private async readAndParseJsonFile(
    filePath: string,
  ): Promise<Record<string, any>> {
    try {
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // ENOENT = Error No Entry (file not found)
        throw new BadRequestException(`File not found at path: ${filePath}`);
      }
      throw new BadRequestException(
        `Failed to read or parse JSON file at ${filePath}: ${error.message}`,
      );
    }
  }
  async checkAllKeysExist(
    sourceFilePath: string,
    targetFilePath: string,
  ): Promise<boolean> {
    let sourceObject: Record<string, any>;
    let targetObject: Record<string, any>;

    try {
      sourceObject = await this.readAndParseJsonFile(sourceFilePath);
      targetObject = await this.readAndParseJsonFile(targetFilePath);
    } catch (error) {
      throw error;
    }

    const missingKeys: string[] = [];
    const sourceKeys = Object.keys(sourceObject);

    for (const key of sourceKeys) {
      if (!(key in targetObject)) {
        missingKeys.push(key);
      }
    }
    if (missingKeys.length > 0) return false;
    return true;
  }
  async copyFileContent(
    sourceFilePath: string,
    destinationFilePath: string,
  ): Promise<void> {
    try {
      await fs.promises.copyFile(sourceFilePath, destinationFilePath);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Error copying file content: ${error.message}`);
      // You might want to re-throw the error or handle it more specifically
      throw error;
    }
  }
  async deleteTempFiles(rootDir: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(rootDir);
      for (const file of files) {
        const filePath = path.join(rootDir, file);
        const stats = await fs.promises.stat(filePath);

        if (stats.isDirectory()) {
          await this.deleteTempFiles(filePath);
        } else {
          if (file.startsWith(env('TEMP_FILE_KEY'))) {
            await fs.promises.unlink(filePath);
          }
        }
      }
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error(`Error deleting temp files: ${error.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleTempFiles() {
    await this.deleteTempFiles(env('UPLOADS_PATH'));
  }
}
