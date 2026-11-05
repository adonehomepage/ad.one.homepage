import { ApiError } from "@/lib/errors";
import { orgText } from "@/modules/admin/org-copy";
import type { LeadFormField } from "@/types";

export const LEAD_NAME_MAX = 80;
export const LEAD_ANSWER_VALUE_MAX = 2_000;

function chrome(settings: Record<string, unknown> | undefined, key: string, fallback: string) {
  return String(settings?.[key] ?? "").trim() || fallback;
}

function asScalar(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean).join(", ");
  return String(value).trim();
}

function asOptionList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  const text = String(value ?? "").trim();
  return text ? [text] : [];
}

function fieldRequiredMessage(field: LeadFormField, settings?: Record<string, unknown>) {
  return chrome(settings, "formFieldRequiredPh", "{label}을(를) 입력해 주세요.").replace("{label}", field.label || field.key);
}

function fieldInvalidMessage(field: LeadFormField, settings?: Record<string, unknown>) {
  return chrome(settings, "formFieldInvalidPh", "{label} 값이 올바르지 않습니다.").replace("{label}", field.label || field.key);
}

/** 공개 폼 정의에 맞게 answers를 검증·정규화한다. name/phone은 제외. */
export function sanitizeLeadAnswers(
  fields: LeadFormField[],
  answers: Record<string, unknown>,
  settings?: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "name" || field.type === "phone") continue;
    if (!field.visible) continue;

    const raw = answers[field.key];
    const options = (field.options ?? []).map((item) => item.trim()).filter(Boolean);

    if (field.type === "checkbox") {
      const selected = asOptionList(raw).map((item) => item.slice(0, LEAD_ANSWER_VALUE_MAX));
      if (options.length > 0 && selected.some((item) => !options.includes(item))) {
        throw new ApiError("VALIDATION_ERROR", fieldInvalidMessage(field, settings), 400, field.key);
      }
      if (field.required && selected.length === 0) {
        throw new ApiError("VALIDATION_ERROR", fieldRequiredMessage(field, settings), 400, field.key);
      }
      if (selected.length > 0) next[field.key] = selected;
      continue;
    }

    if (field.type === "select" || field.type === "radio") {
      const value = asScalar(raw).slice(0, LEAD_ANSWER_VALUE_MAX);
      if (value && options.length > 0 && !options.includes(value)) {
        throw new ApiError("VALIDATION_ERROR", fieldInvalidMessage(field, settings), 400, field.key);
      }
      if (field.required && !value) {
        throw new ApiError("VALIDATION_ERROR", fieldRequiredMessage(field, settings), 400, field.key);
      }
      if (value) next[field.key] = value;
      continue;
    }

    const value = asScalar(raw).slice(0, LEAD_ANSWER_VALUE_MAX);
    if (field.required && !value) {
      throw new ApiError("VALIDATION_ERROR", fieldRequiredMessage(field, settings), 400, field.key);
    }
    if (value) next[field.key] = value;
  }
  return next;
}

export function formatLeadAnswers(answers: unknown, fields?: LeadFormField[]) {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return [];
  const labels = new Map<string, string>();
  for (const field of fields ?? []) {
    if (field.label.trim()) labels.set(field.key, field.label.trim());
  }
  const fallback: Record<string, string> = {
    unitType: orgText("leadAnswerUnitType"),
    inquiry: orgText("leadAnswerInquiry"),
  };
  return Object.entries(answers as Record<string, unknown>).flatMap(([key, value]) => {
    const text = asScalar(value);
    if (!text) return [];
    return [{ key, label: labels.get(key) ?? fallback[key] ?? orgText("leadAnswerExtra"), text }];
  });
}
