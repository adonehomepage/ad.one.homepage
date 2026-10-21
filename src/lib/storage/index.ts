import { appConfig } from "@/lib/config";
import { getDeployEnv } from "@/lib/deploy-env";
import { ApiError } from "@/lib/errors";
import { deleteLocalObject, saveLocalObject } from "@/lib/storage/local";
import { deleteS3Object, readS3Object, saveS3Object } from "@/lib/storage/s3";
import type { SaveObjectInput, SavedObject } from "@/lib/storage/types";
import { orgText } from "@/modules/admin/org-copy";

export type { SaveObjectInput, SavedObject, StorageVisibility } from "@/lib/storage/types";

export function storageProviderName(): "local" | "s3" {
  return appConfig.storageProvider === "s3" ? "s3" : "local";
}

/** 로컬 디스크 쓰기가 가능한지. Vercel·preview·production에서는 local 저장을 막습니다. */
export function isStorageWritable() {
  if (storageProviderName() === "s3") return true;
  if (process.env.VERCEL) return false;
  return getDeployEnv() === "local";
}

export function assertStorageWritable() {
  if (isStorageWritable()) return;
  throw new ApiError("VALIDATION_ERROR", orgText("storageLocalUnavailable"), 503);
}

export async function saveObject(input: SaveObjectInput): Promise<SavedObject> {
  if (storageProviderName() === "s3") {
    return saveS3Object(input);
  }
  assertStorageWritable();
  const saved = await saveLocalObject(input);
  return { ...saved, provider: "local" };
}

export async function deleteObject(bucket: string, objectKey: string) {
  if (storageProviderName() === "s3") {
    return deleteS3Object(bucket, objectKey);
  }
  return deleteLocalObject(bucket, objectKey);
}

export async function readPublicObject(bucket: string, objectKey: string) {
  if (storageProviderName() === "s3") {
    return readS3Object(bucket, objectKey);
  }
  const { readFile } = await import("node:fs/promises");
  const { contentTypeFromObjectKey, localFilePath } = await import("@/lib/storage/local");
  const bytes = await readFile(localFilePath(bucket, objectKey));
  return { bytes, contentType: contentTypeFromObjectKey(objectKey) };
}
