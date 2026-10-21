import { RESERVED_SLUGS } from "@/lib/constants";
import { orgText } from "@/modules/admin/org-copy";

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
    return { ok: false as const, code: "SLUG_INVALID" as const, message: orgText("slugEmpty") };
  }
  if (DISALLOWED.test(normalized)) {
    return {
      ok: false as const,
      code: "SLUG_INVALID" as const,
      message: orgText("slugCharsDenied"),
    };
  }
  if (!/^[\p{L}\p{N}-]+$/u.test(normalized)) {
    return {
      ok: false as const,
      code: "SLUG_INVALID" as const,
      message: orgText("slugCharset"),
    };
  }
  if (RESERVED_SLUGS.includes(normalized.toLowerCase() as (typeof RESERVED_SLUGS)[number])) {
    return { ok: false as const, code: "SLUG_RESERVED" as const, message: orgText("slugPathReserved") };
  }
  return { ok: true as const, value: normalized, lookupKey: slugLookupKey(normalized) };
}

export function displaySlug(value: string) {
  return normalizeSlug(value);
}
