import { RELAY_UPLOAD_MAX_BYTES, relayUploadLimitMessage } from "@/lib/uploads/limits";

const IMAGE_EDGE = 1920;

export async function prepareUploadFile(file: File) {
  if (file.type.startsWith("image/") && file.type !== "image/gif" && file.size > RELAY_UPLOAD_MAX_BYTES) {
    return compressImage(file);
  }
  const message = relayUploadLimitMessage(file.type, file.size);
  if (message) throw new Error(message);
  return file;
}

export async function uploadProjectFile(projectId: string, file: File) {
  const prepared = await prepareUploadFile(file);
  const form = new FormData();
  form.append("file", prepared);
  form.append("projectId", projectId);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? "업로드에 실패했습니다.");
  if (typeof json.url !== "string" || !json.url) throw new Error("업로드 주소를 받지 못했습니다.");
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
    throw new Error("이미지를 줄이지 못했습니다.");
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
    throw new Error("이미지를 줄여도 3.5MB를 넘습니다. 더 작은 사진을 사용해 주세요.");
  }
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
