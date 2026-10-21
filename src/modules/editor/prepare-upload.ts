import { RELAY_UPLOAD_MAX_BYTES, relayUploadLimitMessage } from "@/lib/uploads/limits";
import { orgText } from "@/modules/admin/org-copy";

const IMAGE_EDGE = 1920;

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export async function prepareUploadFile(file: File) {
  if (file.type.startsWith("image/") && file.type !== "image/gif" && file.size > RELAY_UPLOAD_MAX_BYTES) {
    return compressImage(file);
  }
  const message = relayUploadLimitMessage(file.type, file.size);
  if (message) throw new UploadError(message);
  return file;
}

export async function uploadProjectFile(projectId: string, file: File) {
  const prepared = await prepareUploadFile(file);
  const form = new FormData();
  form.append("file", prepared);
  form.append("projectId", projectId);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new UploadError(String(json.message ?? orgText("uploadFail")), res.status, typeof json.code === "string" ? json.code : undefined);
  }
  if (typeof json.url !== "string" || !json.url) throw new UploadError(orgText("uploadNoUrl"), res.status);
  return json.url;
}

async function compressImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new UploadError(orgText("uploadCompressFail"));
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.86;
  let blob: Blob | null = null;
  while (quality >= 0.5) {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= RELAY_UPLOAD_MAX_BYTES) break;
    quality -= 0.12;
  }
  if (!blob || blob.size > RELAY_UPLOAD_MAX_BYTES) {
    throw new UploadError(orgText("uploadStillTooLarge"));
  }
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
