/** 로그인 후 이동 경로. 오픈 리다이렉트를 막습니다. */
export function safeNextPath(next: string | null | undefined, fallback = "/admin") {
  if (!next) return fallback;
  let value = next;
  try {
    value = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("://")) {
    return fallback;
  }
  return value;
}
