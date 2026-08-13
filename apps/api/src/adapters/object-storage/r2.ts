import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import type { ApiEnvironment } from '@/env.js';

export interface HeadObjectResult {
  contentType: string;
  size: number;
}

/**
 * 对象存储接口：上传走浏览器直传（presign → PUT → confirm），
 * 服务端只保留签名、校验与清理能力。
 */
export interface ObjectStorage {
  deleteObject(key: string): Promise<void>;
  headObject(key: string): Promise<HeadObjectResult>;
  presignUpload(input: {
    contentType: string;
    key: string;
    expiresInSeconds?: number;
  }): Promise<string>;
}

export class R2ObjectStorage implements ObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly environment: ApiEnvironment) {
    this.client = new S3Client({
      credentials: {
        accessKeyId: environment.R2_ACCESS_KEY_ID,
        secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
      },
      endpoint: environment.R2_ENDPOINT,
      forcePathStyle: true,
      region: environment.R2_REGION,
    });
  }

  /** 生成一次性 PUT URL（短时效），密钥不出服务端。 */
  async presignUpload(input: {
    contentType: string;
    key: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.environment.R2_BUCKET_NAME,
        ContentType: input.contentType,
        Key: input.key,
      }),
      { expiresIn: input.expiresInSeconds ?? 600 },
    );
  }

  async headObject(key: string): Promise<HeadObjectResult> {
    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.environment.R2_BUCKET_NAME,
        Key: key,
      }),
    );
    return {
      contentType: response.ContentType ?? '',
      size: response.ContentLength ?? 0,
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.environment.R2_BUCKET_NAME,
        Key: key,
      }),
    );
  }
}
