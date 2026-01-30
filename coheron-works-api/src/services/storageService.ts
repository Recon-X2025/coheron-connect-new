import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from '../utils/logger.js';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: !!process.env.S3_ENDPOINT, // needed for MinIO
    });
  }
  return s3Client;
}

function getBucket(): string {
  return process.env.S3_BUCKET_NAME || 'coheron-erp';
}

export async function uploadFile(key: string, body: Buffer, contentType: string, metadata?: Record<string, string>): Promise<string> {
  const client = getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  }));
  logger.info({ key, contentType }, 'File uploaded to S3');
  return key;
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client();
  const url = await getSignedUrl(client, new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }), { expiresIn });
  return url;
}

export async function getPresignedUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const client = getS3Client();
  const url = await getSignedUrl(client, new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  }), { expiresIn });
  return url;
}

export async function deleteFile(key: string): Promise<void> {
  const client = getS3Client();
  await client.send(new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }));
  logger.info({ key }, 'File deleted from S3');
}

export async function downloadFile(key: string): Promise<{ body: any; contentType?: string }> {
  const client = getS3Client();
  const response = await client.send(new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  }));
  return { body: response.Body, contentType: response.ContentType };
}
