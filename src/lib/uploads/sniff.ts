/** 파일 매직 바이트로 MIME을 추정. 알 수 없으면 null. */
export function sniffMime(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (bytes.length >= 6) {
    const gif = bytes.toString("ascii", 0, 6);
    if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  }
  if (bytes.length >= 5 && bytes.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  if (bytes.length >= 12 && bytes.toString("ascii", 4, 8) === "ftyp") {
    return "video/mp4";
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}

/** 클라이언트가 보낸 MIME과 스니프 결과가 같은 계열인지. */
export function mimeMatchesSniff(claimed: string, sniffed: string) {
  if (claimed === sniffed) return true;
  if (claimed.startsWith("image/") && sniffed.startsWith("image/")) {
    return claimed === sniffed;
  }
  if (claimed.startsWith("video/") && sniffed.startsWith("video/")) {
    return true;
  }
  return false;
}
