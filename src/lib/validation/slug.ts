import { RESERVED_SLUGS } from "@/lib/constants";

const DISALLOWED = /[/?#\\\s\u0000-\u001f]/;

export function normalizeSlug(value: string) {
  return value.trim().normalize("NFC").replace(/\s+/g, "");
}

export function slugLookupKey(value: string) {
  return normalizeSlug(value).toLowerCase();
}

export function validateSlug(value: string) {
  const normalized = normalizeSlug(value);
  if (!normalized) {
    return { ok: false as const, code: "SLUG_INVALID" as const, message: "공개 URL 텍스트를 입력해 주세요." };
  }
  if (DISALLOWED.test(normalized)) {
    return {
      ok: false as const,
      code: "SLUG_INVALID" as const,
      message: "공개 URL에는 /, ?, #, 공백, 제어 문자를 사용할 수 없습니다.",
    };
  }
  if (!/^[\p{L}\p{N}-]+$/u.test(normalized)) {
    return {
      ok: false as const,
      code: "SLUG_INVALID" as const,
      message: "공개 URL은 한글, 영문, 숫자, 하이픈만 사용할 수 있습니다.",
    };
  }
  if (RESERVED_SLUGS.includes(normalized.toLowerCase() as (typeof RESERVED_SLUGS)[number])) {
    return { ok: false as const, code: "SLUG_RESERVED" as const, message: "예약된 경로는 공개 URL로 사용할 수 없습니다." };
  }
  return { ok: true as const, value: normalized, lookupKey: slugLookupKey(normalized) };
}

export function displaySlug(value: string) {
  return normalizeSlug(value);
}
