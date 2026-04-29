/**
 * S3-compatible object storage. Works with AWS S3, Cloudflare R2, Backblaze B2.
 *
 * We expose presigned PUT URLs for direct browser upload (no proxying through
 * the API server). Each upload is keyed by `<scope>/<id>/<random>.<ext>` so we
 * can attribute and clean up if needed.
 *
 * Required env: S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 * Optional: S3_REGION (defaults to "auto" for R2), NEXT_PUBLIC_S3_PUBLIC_URL
 */

import crypto from "node:crypto";
import { env } from "@/lib/env";

let _client: unknown = null;

async function getClient() {
  if (_client) return _client;
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
    throw new Error("S3 storage is not configured");
  }
  const { S3Client } = await import("@aws-sdk/client-s3");
  _client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: !env.S3_ENDPOINT.includes("amazonaws.com"),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export type UploadScope = "band" | "article" | "user" | "show";

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresInSec: number;
  maxBytes: number;
}

export async function presignUpload(opts: {
  scope: UploadScope;
  ownerId: string;
  contentType: string;
  contentLength: number;
}): Promise<PresignedUpload> {
  if (!ALLOWED_MIME.has(opts.contentType)) {
    throw new Error(`Unsupported content-type: ${opts.contentType}`);
  }
  if (opts.contentLength > MAX_BYTES) {
    throw new Error(`Upload too large (max ${MAX_BYTES} bytes)`);
  }

  const ext = EXT_BY_MIME[opts.contentType];
  const random = crypto.randomBytes(8).toString("hex");
  const key = `${opts.scope}/${opts.ownerId}/${random}.${ext}`;

  const client = (await getClient()) as Awaited<ReturnType<typeof importS3>>["client"];
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET!,
    Key: key,
    ContentType: opts.contentType,
    ContentLength: opts.contentLength,
    CacheControl: "public, max-age=31536000, immutable",
  });

  const expiresInSec = 60 * 5;
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSec });

  const publicBase = (env.NEXT_PUBLIC_S3_PUBLIC_URL ?? "").replace(/\/$/, "");
  const publicUrl = publicBase
    ? `${publicBase}/${key}`
    : `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`;

  return { uploadUrl, publicUrl, key, expiresInSec, maxBytes: MAX_BYTES };
}

export async function deleteObject(key: string) {
  const client = (await getClient()) as Awaited<ReturnType<typeof importS3>>["client"];
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  await client.send(
    new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: key })
  );
}

// Help TS infer the dynamic import shape
async function importS3() {
  const mod = await import("@aws-sdk/client-s3");
  return { client: new mod.S3Client({}) };
}

export const STORAGE_LIMITS = { MAX_BYTES, ALLOWED_MIME } as const;
