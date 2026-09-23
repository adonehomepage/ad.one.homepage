import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";
import { appConfig } from "@/lib/config";
import { assertAllowedFile } from "@/lib/storage/local";
import type { SaveObjectInput, SavedObject } from "@/lib/storage/types";

function client() {
  if (!appConfig.s3AccessKeyId || !appConfig.s3SecretAccessKey) {
    throw new Error("S3 자격 증명이 설정되지 않았습니다.");
  }
  return new S3Client({
    region: appConfig.s3Region,
    endpoint: appConfig.s3Endpoint || undefined,
    forcePathStyle: appConfig.s3ForcePathStyle,
    credentials: {
      accessKeyId: appConfig.s3AccessKeyId,
      secretAccessKey: appConfig.s3SecretAccessKey,
    },
  });
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

function objectKey(fileName: string) {
  return `${new Date().toISOString().slice(0, 10)}/${nanoid(12)}-${sanitize(fileName)}`;
}

function publicUrl(bucket: string, key: string) {
  const base = appConfig.storagePublicBaseUrl.replace(/\/$/, "");
  return `${base}/${bucket}/${key}`;
}

export async function saveS3Object(input: SaveObjectInput): Promise<SavedObject> {
  assertAllowedFile(input.mime, input.bytes.length);
  const key = objectKey(input.fileName);
  await client().send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: key,
      Body: input.bytes,
      ContentType: input.mime,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return {
    objectKey: key,
    bucketName: input.bucket,
    publicUrl: input.visibility === "public" ? publicUrl(input.bucket, key) : null,
    provider: "s3",
  };
}

export async function readS3Object(bucket: string, key: string) {
  const res = await client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const body = res.Body;
  if (!body) return null;
  const bytes = Buffer.from(await body.transformToByteArray());
  return { bytes, contentType: res.ContentType ?? "application/octet-stream" };
}

export async function deleteS3Object(bucket: string, key: string) {
  await client()
    .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    .catch(() => undefined);
}
