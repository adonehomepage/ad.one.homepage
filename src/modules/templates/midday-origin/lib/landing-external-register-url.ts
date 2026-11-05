/**
 * 관심고객 등록용 외부 URL(구글폼 등) 정규화.
 * http/https 만 허용. 프로토콜 없으면 https:// 부여.
 */
export function normalizeExternalRegisterUrl(
  raw: string | null | undefined
): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function openExternalRegisterUrl(raw: string | null | undefined): boolean {
  const url = normalizeExternalRegisterUrl(raw);
  if (!url || typeof window === "undefined") return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
