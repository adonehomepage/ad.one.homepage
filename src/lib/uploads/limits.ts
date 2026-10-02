/** Vercel 함수로 파일을 넘길 때 플랫폼이 거절하기 전에 막습니다. */
export const RELAY_UPLOAD_MAX_BYTES = 3_500_000;

export function relayUploadLimitMessage(mime: string, size: number) {
  if (size <= RELAY_UPLOAD_MAX_BYTES) return null;
  if (mime.startsWith("video/")) {
    return "영상은 3.5MB까지만 파일로 올릴 수 있습니다. 더 큰 영상은 영상 주소에 넣어 주세요.";
  }
  return "파일은 3.5MB 이하여야 합니다.";
}
