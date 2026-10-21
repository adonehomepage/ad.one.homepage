import { orgText } from "@/modules/admin/org-copy";
/** Vercel 함수로 파일을 넘길 때 플랫폼이 거절하기 전에 막습니다. */
export const RELAY_UPLOAD_MAX_BYTES = 3_500_000;

export function relayUploadLimitMessage(mime: string, size: number) {
  if (size <= RELAY_UPLOAD_MAX_BYTES) return null;
  if (mime.startsWith("video/")) {
    return orgText("uploadVideoLimit");
  }
  return orgText("uploadFileLimit");
}
