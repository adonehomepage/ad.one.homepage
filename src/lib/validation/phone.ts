export function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+82")) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

export function isKoreanMobile(value: string) {
  const normalized = normalizePhone(value);
  return /^01[016789]\d{7,8}$/.test(normalized);
}

export function displayPhone(value: string) {
  const normalized = normalizePhone(value);
  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
  }
  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  return normalized;
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
