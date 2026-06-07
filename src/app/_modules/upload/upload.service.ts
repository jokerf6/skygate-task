import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { lookup } from 'mime-types';
import * as fs from 'fs';
import * as path from 'path';

import { PRESIGNED_URL_EXPIRY_SECONDS } from './upload.constants';

interface UploadVerifyResult {
  success: boolean;
  metadata?: { size: number; type: string; lastModified: Date };
  error?: string;
}

@Injectable()
export class UploadService implements OnModuleInit {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private readonly isAwsEnabled: boolean;
  private readonly uploadsPath: string;
  private readonly mainUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.isAwsEnabled =
      this.configService.get<string>('AWS_MEDIA') === 'true' ||
      (this.configService.get<boolean>('AWS_MEDIA') as unknown) === true;

    this.uploadsPath = this.configService.get<string>('UPLOADS_PATH') ?? './uploads';
    this.mainUrl = this.configService.get<string>('MAIN_URL') ?? 'http://localhost:3030';
  }

  onModuleInit(): void {
    if (this.isAwsEnabled) {
      this.initS3Client();
    } else {
      this.ensureLocalUploadsDir();
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async getPresignedUrl(
    filename: string,
    filetype: string,
    folder = 'uploads',
  ): Promise<{ url: string; key: string }> {
    const key = `${folder}/${uuidv4()}-${filename}`;

    return this.isAwsEnabled
      ? this.getS3PresignedUrl(key, filetype)
      : this.getLocalUploadUrl(key);
  }

  async verifyUpload(key: string): Promise<UploadVerifyResult> {
    return this.isAwsEnabled
      ? this.verifyS3Upload(key)
      : this.verifyLocalUpload(key);
  }

  // ─── AWS S3 ──────────────────────────────────────────────────────────────────

  private initS3Client(): void {
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    const accessKeyId = this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME');

    this.s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private async getS3PresignedUrl(
    key: string,
    filetype: string,
  ): Promise<{ url: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: filetype,
    });

    const url = await getSignedUrl(this.s3Client!, command, {
      expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
    });

    return { url, key };
  }

  private async verifyS3Upload(key: string): Promise<UploadVerifyResult> {
    try {
      const result = await this.s3Client!.send(
        new HeadObjectCommand({ Bucket: this.bucketName, Key: key }),
      );

      return {
        success: true,
        metadata: {
          size: result.ContentLength!,
          type: result.ContentType!,
          lastModified: result.LastModified!,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ─── Local Storage ───────────────────────────────────────────────────────────

  private ensureLocalUploadsDir(): void {
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
    }
  }

  private getLocalUploadUrl(key: string): { url: string; key: string } {
    const url = `${this.mainUrl}/api/upload/local-upload/${key}`;
    return { url, key };
  }

  private verifyLocalUpload(key: string): UploadVerifyResult {
    try {
      const filePath = path.join(this.uploadsPath, key);

      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File does not exist' };
      }

      const stats = fs.statSync(filePath);

      return {
        success: true,
        metadata: {
          size: stats.size,
          type: this.getMimeType(filePath),
          lastModified: stats.mtime,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────

  private getMimeType(filePath: string): string {
    const mime = lookup(filePath);
    return typeof mime === 'string' ? mime : 'application/octet-stream';
  }
}