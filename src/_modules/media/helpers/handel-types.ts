import * as fs from 'fs';
import * as path from 'path';
import { handelSucceededTemp } from './handel-temp-files';
import { renameFile } from './rename-file';
export class HandelFiles {
  private baseFolder?: string | number;
  constructor(baseFolder: string | number) {
    this.baseFolder = baseFolder;
  }

  handelFilesObjectTemp(filesObject: { [key: string]: UploadedFile[] }) {
    Object.values(filesObject).map((files) => {
      if (files) return handelSucceededTemp(files, this.baseFolder);
    });
  }

  handelFileTemp(file: UploadedFile) {
    return renameFile(
      file?.path,
      HandelFiles.path(file?.path, this.baseFolder),
    );
  }

  static path(
    filePath: string | undefined,
    baseFolder?: string | number | undefined,
  ) {
    if (baseFolder)
      return path
        .join(path.dirname(filePath), `${baseFolder}`, path.basename(filePath))
        .replace(env('TEMP_FILE_KEY'), '');

    return path
      .join(path.dirname(filePath), path.basename(filePath))
      .replace(env('TEMP_FILE_KEY'), '');
  }

  static generatePath<DTOType>(
    files: any,
    dto: DTOType,
    parentPath?: string | number,
  ) {
    for (const key of Object.keys(files)) {
      if (Array.isArray(files[key])) {
        dto[key] = files[key].map((file) => {
          if (file) return HandelFiles.path(file?.path, parentPath);
        });
      } else {
        if (files[key])
          dto[key] = HandelFiles.path(files[key]?.path, parentPath);
      }
    }
  }

  static handelReplaced<FilesType, CurrentDocsType>(
    files: FilesType,
    currentDocs: CurrentDocsType,
  ) {
    for (const key of Object.keys(files)) {
      if (Array.isArray(files[key])) {
        files[key].map((file) => {
          if (file?.path !== currentDocs[key] && currentDocs[key]) {
            renameFile(file?.path, currentDocs[key]);
          }
        });
      } else {
        if (files[key]?.path !== currentDocs[key] && currentDocs[key]) {
          renameFile(files[key]?.path, currentDocs[key]);
        }
      }
    }
  }
  static deleteFile(filePath: string) {
    fs.unlinkSync(filePath);
  }
}
