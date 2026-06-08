import {
  applyDecorators,
  BadRequestException,
  SetMetadata,
  UseInterceptors,
} from '@nestjs/common';
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';
import { UploadTypes } from 'src/declares/types/upload.types';
import { EmptyInterceptor } from 'src/globals/interceptors/empty.interceptor';
import { MapUploadsInterceptor } from 'src/globals/interceptors/handle-uploads-interceptor';
import { RequiredFileValidationInterceptor } from 'src/globals/interceptors/required-files-Interceptor';
import { v4 } from 'uuid';

export const uploadOptions = (
  filePath: string,
  type?: UploadTypes,
  options?: UploadOptions,
) => {
  let fileKey = '';
  const allowedMimeTypes = uniqueValues([
    ...(options?.allowedTypes ?? []),
    ...(options?.allowedMimeTypes ?? []),
  ]);
  const allowedExtensions = normalizeExtensions(options?.allowedExtensions);
  const blockedMimeTypes = uniqueValues([
    ...(options?.disallowedTypes ?? []),
    ...(options?.blockedMimeTypes ?? []),
  ]);
  const blockedExtensions = normalizeExtensions(options?.blockedExtensions);
  const allowedMimePrefixes = uniqueValues([
    ...(options?.allowedMimePrefixes ?? []),
    ...(options?.fileTypePrefix ? [options.fileTypePrefix] : []),
  ]);

  const uploadOptions = {
    fileFilter: (
      _req: any,
      file: { fieldname: string; mimetype: string; originalname: string },
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      fileKey = file.fieldname;

      const extension = path.extname(file.originalname).toLowerCase();

      if (blockedMimeTypes.includes(file.mimetype)) {
        return callback(
          new BadRequestException('invalidFileType', {
            cause: { fieldname: file.fieldname },
          }),
          false,
        );
      }

      if (blockedExtensions.includes(extension)) {
        return callback(
          new BadRequestException('invalidFileExtension', {
            cause: { fieldname: file.fieldname, extension },
          }),
          false,
        );
      }

      if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
        return callback(
          new BadRequestException('invalidFileType', {
            cause: { fieldname: file.fieldname, mimetype: file.mimetype },
          }),
          false,
        );
      }

      if (
        allowedMimePrefixes.length > 0 &&
        !allowedMimePrefixes.some((prefix) => file.mimetype.startsWith(prefix))
      ) {
        return callback(
          new BadRequestException('invalidFileType', {
            cause: { fieldname: file.fieldname, mimetype: file.mimetype },
          }),
          false,
        );
      }

      if (
        allowedExtensions.length > 0 &&
        !allowedExtensions.includes(extension)
      ) {
        return callback(
          new BadRequestException('invalidFileExtension', {
            cause: { fieldname: file.fieldname, extension },
          }),
          false,
        );
      }

      callback(null, true);
    },

    limits: {
      fileSize: options?.maxSize ?? 5 * 1024 * 1024,
    },

    storage: diskStorage({
      filename(_req, file, callback) {
        let fileName = '';
        if (type === 'many')
          fileName =
            env('TEMP_FILE_KEY') +
            fileKey +
            '-' +
            v4() +
            path.extname(file.originalname);
        else
          fileName =
            env('TEMP_FILE_KEY') + v4() + path.extname(file.originalname);
        callback(null, fileName);
      },

      destination(_, __, callback) {
        const uploadPath = `${env('UPLOADS_PATH')}/${filePath}`;
        if (!existsSync(env('UPLOADS_PATH'))) {
          mkdirSync(env('UPLOADS_PATH'));
        }
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        callback(null, uploadPath);
      },
    }),
  };

  return uploadOptions;
};

const normalizeExtensions = (extensions?: string[]) =>
  uniqueValues(
    (extensions ?? []).map((extension) => extension.toLowerCase().trim()),
  );

const uniqueValues = (values: string[]) =>
  [...new Set(values.filter((value) => value.length > 0))];

export const UploadFiles = (
  key: string,
  filePath?: string,
  maxCount: number = 10,
) => {
  return applyDecorators(
    UseInterceptors(
      FilesInterceptor(key, maxCount, uploadOptions(filePath, 'many')),
      MapUploadsInterceptor,
    ),
    ApiConsumes('multipart/form-data'),
  );
};

export const UploadMultipleFiles = (
  fields: {
    name: string;
    maxCount?: number;
    filePath?: string;
    fileType?: string;
    required?: boolean;
  }[],
) => {
  const generateRequired = (
    requiredFields = fields.filter((f) => f.required).map((f) => f.name),
  ) => SetMetadata('requiredFiles', requiredFields);

  return applyDecorators(
    generateRequired(),
    UseInterceptors(
      FileFieldsInterceptor(
        fields.map((field) => ({
          name: field.name,
          maxCount: field.maxCount || 1,
        })),
        {
          fileFilter: (_, file, callback) => {
            const field = fields.find((f) => f.name === file.fieldname);
            if (!field) {
              return callback(
                new BadRequestException('errors.unknownField', {
                  cause: { fieldname: file.fieldname },
                }),
                false,
              );
            }

            if (field.fileType && !file.mimetype.startsWith(field.fileType)) {
              return callback(
                new BadRequestException(
                  `errors.invalidFileType ${field.name}`,
                  {
                    cause: { fieldname: file.fieldname },
                  },
                ),
                false,
              );
            }

            callback(null, true);
          },
          storage: diskStorage({
            destination: (_, file, callback) => {
              const field = fields.find((f) => f.name === file.fieldname);
              const uploadPath = `${env('UPLOADS_PATH')}/${field?.filePath || ''}`;
              if (!existsSync(env('UPLOADS_PATH'))) {
                mkdirSync(env('UPLOADS_PATH'));
              }
              if (!existsSync(uploadPath)) {
                mkdirSync(uploadPath, { recursive: true });
              }
              callback(null, uploadPath);
            },
            filename: (_, file, callback) => {
              const fileName = `${env('TEMP_FILE_KEY')}${file.fieldname}-${v4()}${path.extname(file.originalname)}`;
              callback(null, fileName);
            },
          }),
        },
      ),
      RequiredFileValidationInterceptor,
    ),
    ApiConsumes('multipart/form-data'),
  );
};
interface UploadOptions {
  allowedTypes?: string[]; // e.g., ['image/jpeg', 'image/png']
  allowedMimeTypes?: string[];
  allowedMimePrefixes?: string[];
  allowedExtensions?: string[];
  maxSize?: number; // in bytes (e.g., 5 * 1024 * 1024 for 5MB)
  disallowedTypes?: string[]; // e.g.,
  blockedMimeTypes?: string[];
  blockedExtensions?: string[];
  fileTypePrefix?: string; // e.g., 'image/' to allow all image types
}

export const UploadFile = (
  key: string,
  filePath?: string,
  interceptor?: any,
  options?: UploadOptions,
) => {
  return applyDecorators(
    UseInterceptors(
      FileInterceptor(
        key,
        uploadOptions(
          filePath || 'path',
          undefined,
          options,
        ),
      ),
      MapUploadsInterceptor,
      interceptor ? interceptor : EmptyInterceptor,
    ),
    ApiConsumes('multipart/form-data'),
  );
};
