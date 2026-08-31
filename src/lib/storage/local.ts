import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { appConfig } from "@/lib/config";
import { nanoid } from "nanoid";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

export function assertAllowedFile(mime: string, size: number) {
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error("허용되지 않은 파일 형식입니다.");
  }
  const max = mime.startsWith("video/") ? 200 * 1024 * 1024 : 20 * 1024 * 1024;
  if (size > max) {
    throw new Error("파일 용량이 너무 큽니다.");
  }
}

export async function saveLocalObject(input: {
  bucket: string;
  fileName: string;
  mime: string;
  bytes: Buffer;
  visibility: "public" | "private";
}) {
  assertAllowedFile(input.mime, input.bytes.length);
  const key = `${new Date().toISOString().slice(0, 10)}/${nanoid(12)}-${sanitize(input.fileName)}`;
  const full = path.join(appConfig.storageLocalRoot, input.bucket, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, input.bytes);
  return {
    objectKey: key,
    bucketName: input.bucket,
    publicUrl: input.visibility === "public" ? `${appConfig.storagePublicBaseUrl}/${input.bucket}/${key}` : null,
  };
}

export function localFilePath(bucket: string, objectKey: string) {
  return path.join(appConfig.storageLocalRoot, bucket, objectKey);
}

export async function deleteLocalObject(bucket: string, objectKey: string) {
  await unlink(localFilePath(bucket, objectKey)).catch(() => undefined);
}

function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}
