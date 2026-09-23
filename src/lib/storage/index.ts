import { appConfig } from "@/lib/config";
import { deleteLocalObject, saveLocalObject } from "@/lib/storage/local";
import { deleteS3Object, readS3Object, saveS3Object } from "@/lib/storage/s3";
import type { SaveObjectInput, SavedObject } from "@/lib/storage/types";

export type { SaveObjectInput, SavedObject, StorageVisibility } from "@/lib/storage/types";

export function storageProviderName(): "local" | "s3" {
  return appConfig.storageProvider === "s3" ? "s3" : "local";
}

export async function saveObject(input: SaveObjectInput): Promise<SavedObject> {
  if (storageProviderName() === "s3") {
    return saveS3Object(input);
  }
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
  const { localFilePath } = await import("@/lib/storage/local");
  const bytes = await readFile(localFilePath(bucket, objectKey));
  return { bytes, contentType: "application/octet-stream" };
}
