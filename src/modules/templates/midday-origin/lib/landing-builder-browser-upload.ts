/**
 * 애드잇 업로드 어댑터 — 직방 S3/빌더 API 대신 /api/uploads 사용.
 * (회사 스토리지·인증 미연결)
 */

import { uploadProjectFile } from "@/modules/editor/prepare-upload";

export type LandingUploadedImage = {
  key: string;
  url: string;
  contentType: string;
  originalFilename: string;
};

export async function uploadLandingImageViaApi(
  file: Blob,
  opts?: { filename?: string; projectId?: string; signal?: AbortSignal },
): Promise<LandingUploadedImage> {
  const projectId = opts?.projectId?.trim();
  if (!projectId) {
    throw new Error("이미지 업로드에는 프로젝트가 필요합니다.");
  }
  const filename = opts?.filename?.trim() || "landing-image.jpg";
  const asFile =
    file instanceof File
      ? file
      : new File([file], filename, { type: file.type || "image/jpeg" });
  const url = await uploadProjectFile(projectId, asFile);
  return {
    key: url,
    url,
    contentType: asFile.type || "image/jpeg",
    originalFilename: asFile.name || filename,
  };
}
