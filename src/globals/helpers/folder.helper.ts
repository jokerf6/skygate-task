import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

const logger = new Logger('FolderHelper');

export async function copyAndRenameFolder(
  sourcePath: string,
  destinationBasePath: string,
  newFolderName: string,
): Promise<string> {
  const newFolderPath = path.join(destinationBasePath, newFolderName);

  try {
    await fs.access(sourcePath);

    const exists = await fs
      .access(newFolderPath)
      .then(() => true)
      .catch(() => false);

    if (exists) {
      throw new Error(`Destination folder already exists: ${newFolderPath}`);
    }

    await fs.cp(sourcePath, newFolderPath, {
      recursive: true,
    });

    logger.log('Folder copied successfully', {
      sourcePath,
      newFolderPath,
    });

    return newFolderPath;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error('Failed to copy folder', {
      sourcePath,
      destinationBasePath,
      newFolderName,
      error: message,
    });

    throw error;
  }
}
