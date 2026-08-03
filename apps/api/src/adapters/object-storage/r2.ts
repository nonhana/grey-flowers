import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

import type { ApiEnvironment } from '@/env.js';

export interface PutObjectInput {
  body: Uint8Array;
  contentType: string;
  key: string;
  size: number;
}

export interface ObjectStorage {
  deleteObject(key: string): Promise<void>;
  putObject(input: PutObjectInput): Promise<void>;
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

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Body: input.body,
        Bucket: this.environment.R2_BUCKET_NAME,
        ContentLength: input.size,
        ContentType: input.contentType,
        Key: input.key,
      }),
    );
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
