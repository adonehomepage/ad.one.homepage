export type StorageVisibility = "public" | "private";

export type SavedObject = {
  objectKey: string;
  bucketName: string;
  publicUrl: string | null;
  provider: "local" | "s3";
};

export type SaveObjectInput = {
  bucket: string;
  fileName: string;
  mime: string;
  bytes: Buffer;
  visibility: StorageVisibility;
};
