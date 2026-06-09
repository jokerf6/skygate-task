import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { lookup as lookupMimeType } from 'mime-types';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';
import { Auth } from 'src/_modules/authentication/decorators/auth.decorator';
import { ApiScope } from 'src/decorators/api/api-scope.decorator';
import { UploadFile } from 'src/decorators/api/upload-file.decorator';
import { tag } from 'src/globals/helpers/tag.helper';
import { ResponseService } from 'src/globals/services/response.service';
import { ALLOWED_EXTENSIONS, BLOCKED_EXTENSIONS } from './upload.constants';
import { CreateUploadDTO, LocalUploadDTO } from './upload.dto';
import { sanitizeSegment } from './upload.helpers';
import { UploadService } from './upload.service';

const PREFIX = 'upload';
const LOCAL_UPLOAD_FOLDER = 'uploads';
const LOCAL_UPLOAD_MAX_SIZE = 10 * 1024 * 1024;
const LOCAL_UPLOAD_ALLOWED_MIME_TYPES = Array.from(
  new Set(
    [...ALLOWED_EXTENSIONS]
      .map((extension) => lookupMimeType(extension))
      .filter((mimeType): mimeType is string => Boolean(mimeType)),
  ),
);

@Controller(PREFIX)
@ApiTags(tag(PREFIX))
@ApiScope(['admin', 'customer'])
@Auth()
export class UploadController {
  private readonly uploadsPath: string;

  constructor(
    private readonly service: UploadService,
    private readonly response: ResponseService,
    private readonly configService: ConfigService,
  ) {
    this.uploadsPath =
      this.configService.get<string>('UPLOADS_PATH') ?? './uploads';
  }

  @Post('/presigned-url')
  async getPresignedUrl(@Body() body: CreateUploadDTO, @Res() res: Response) {
    const { filename, filetype, folder } = body;
    const data = await this.service.getPresignedUrl(filename, filetype, folder);
    return this.response.success(
      res,
      'Presigned URL generated successfully',
      data,
    );
  }

  @Post('/verify')
  async verifyUpload(@Body() body: { key: string }, @Res() res: Response) {
    if (!body.key) {
      throw new BadRequestException('Key is required');
    }
    const result = await this.service.verifyUpload(body.key);
    if (!result.success) {
      throw new BadRequestException(`Verification failed: ${result.error}`);
    }
    return this.response.success(
      res,
      'Upload verified successfully',
      result.metadata,
    );
  }

  @Post('/local-upload/:key(*)')
  @UploadFile('file', LOCAL_UPLOAD_FOLDER, undefined, {
    maxSize: LOCAL_UPLOAD_MAX_SIZE,
    allowedExtensions: [...ALLOWED_EXTENSIONS],
    blockedExtensions: [...BLOCKED_EXTENSIONS],
    allowedMimeTypes: LOCAL_UPLOAD_ALLOWED_MIME_TYPES,
  })
  async localUpload(
    @Param('key') key: string,
    @Body() body: LocalUploadDTO,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const normalizedKey = this.validateUploadKey(key);
    const storageKey = this.normalizeLocalKey(normalizedKey);
    const file = req.file;

    if (!file?.path) {
      throw new BadRequestException('No file uploaded');
    }

    const fileExtension = path.extname(file.originalname).toLowerCase();
    const finalKey = this.resolveStoredKey(storageKey, fileExtension);
    const filePath = this.getDestinationPath(finalKey);
    this.ensureDirectoryExists(path.dirname(filePath));

    if (fs.existsSync(filePath)) {
      throw new BadRequestException('File already exists');
    }

    fs.renameSync(file.path, filePath);

    return this.response.success(res, 'File uploaded successfully', {
      key: this.getPublicKey(finalKey),
      mediaUrl: `/media?media=${this.getPublicKey(finalKey)}`,
      file: finalKey,
    });
  }

  private validateUploadKey(key: string): string {
    const normalizedKey = sanitizeSegment(key, 'key');
    const ext = path.extname(normalizedKey).toLowerCase();
    if (ext) {
      this.validateExtension(ext);
    }
    return normalizedKey;
  }

  private normalizeLocalKey(key: string): string {
    return key.startsWith('uploads/') ? key.slice('uploads/'.length) : key;
  }

  private resolveStoredKey(key: string, fileExtension: string): string {
    if (path.extname(key)) {
      return key;
    }

    if (!fileExtension) {
      return key;
    }

    return `${key}${fileExtension}`;
  }

  private validateExtension(ext: string): void {
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('File type is not allowed');
    }
    if (ALLOWED_EXTENSIONS.size > 0 && !ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('Unsupported file extension');
    }
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private getDestinationPath(key: string): string {
    return path.join(this.uploadsPath, LOCAL_UPLOAD_FOLDER, key);
  }

  private getPublicKey(key: string): string {
    return `${LOCAL_UPLOAD_FOLDER}/${key}`;
  }
}
