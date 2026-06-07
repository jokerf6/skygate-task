import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';
import { Auth } from 'src/_modules/authentication/decorators/auth.decorator';
import { tag } from 'src/globals/helpers/tag.helper';
import { ResponseService } from 'src/globals/services/response.service';
import {
  ALLOWED_EXTENSIONS,
  BLOCKED_EXTENSIONS,
  getMaxBytes,
} from './upload.constants';
import { safeJoin, sanitizeSegment } from './upload.helpers';
import { UploadService } from './upload.service';

const PREFIX = 'upload';

@Controller(PREFIX)
@ApiTags(tag(PREFIX))
@Auth()
export class UploadController {
  private readonly uploadsPath: string;

  constructor(
    private readonly service: UploadService,
    private readonly response: ResponseService,
    private readonly configService: ConfigService,
  ) {
    this.uploadsPath = this.configService.get<string>('UPLOADS_PATH') ?? './uploads';
  }

  @Post('/presigned-url')
  async getPresignedUrl(
    @Body() body: { filename: string; filetype: string; folder?: string },
    @Res() res: Response,
  ) {
    const { filename, filetype, folder } = body;
    if (!filename || !filetype) {
      throw new BadRequestException('Filename and filetype are required');
    }
    const data = await this.service.getPresignedUrl(filename, filetype, folder);
    return this.response.success(res, 'Presigned URL generated successfully', data);
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
    return this.response.success(res, 'Upload verified successfully', result.metadata);
  }


  @Put('/local-upload/:key(*)')
  async localUpload(
    @Param('key') key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    key = sanitizeSegment(key, 'key');

    const ext = path.extname(key).toLowerCase();
    const maxBytes = getMaxBytes(ext);

    this.validateExtension(ext);
    this.validateContentLength(req, maxBytes);

    const filePath = safeJoin(this.uploadsPath, key);
    this.ensureDirectoryExists(path.dirname(filePath));

    const writeStream = this.createWriteStream(filePath);

    this.enforceSizeLimit(req, writeStream, filePath, maxBytes);

    req.pipe(writeStream);

    return this.waitForUpload(req, writeStream, filePath).then(() =>
      this.response.success(res, 'File uploaded successfully', { key }),
    );
  }


  private validateExtension(ext: string): void {
    if (BLOCKED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('File type is not allowed');
    }
    if (ALLOWED_EXTENSIONS.size > 0 && !ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('Unsupported file extension');
    }
  }

  private validateContentLength(req: Request, maxBytes: number): void {
    const contentLength = req.headers['content-length'];
    if (!contentLength) return;

    const size = Number(contentLength);
    if (Number.isFinite(size) && size > maxBytes) {
      throw new BadRequestException(
        `File too large. Max ${maxBytes / (1024 * 1024)}MB allowed`,
      );
    }
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private createWriteStream(filePath: string): fs.WriteStream {
    try {
      return fs.createWriteStream(filePath, { flags: 'wx' });
    } catch (err) {
      throw new BadRequestException(`Could not initiate upload: ${err.message}`);
    }
  }

  private enforceSizeLimit(
    req: Request,
    writeStream: fs.WriteStream,
    filePath: string,
    maxBytes: number,
  ): void {
    let bytesReceived = 0;

    req.on('data', (chunk: Buffer) => {
      bytesReceived += chunk.length;

      if (bytesReceived > maxBytes) {
        req.destroy(new Error('File too large'));
        writeStream.destroy(new Error('File too large'));
        this.cleanupFile(filePath);
      }
    });
  }

  private waitForUpload(
    req: Request,
    writeStream: fs.WriteStream,
    filePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);

      writeStream.on('error', (err) => {
        this.cleanupFile(filePath);
        reject(new BadRequestException(`Upload failed: ${err.message}`));
      });

      req.on('error', (err) => {
        this.cleanupFile(filePath);
        reject(new BadRequestException(`Upload failed: ${err.message}`));
      });
    });
  }

  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // Silently ignore cleanup errors
    }
  }
}