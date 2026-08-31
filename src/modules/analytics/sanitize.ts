const PERSONAL_KEYS = ["name", "phone", "email", "inquiry", "inquiryText"];

export function sanitizeAnalyticsMetadata(metadata: Record<string, unknown>) {
  const clean: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (PERSONAL_KEYS.includes(key)) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      clean[key] = value;
    }
  }
  return clean;
}
