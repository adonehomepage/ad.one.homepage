import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors";
import { formatLeadAnswers, sanitizeLeadAnswers } from "@/modules/leads/answers";
import type { LeadFormField } from "@/types";

const fields: LeadFormField[] = [
  { key: "name", type: "name", label: "이름", required: true, visible: true, includeInNotification: true },
  { key: "phone", type: "phone", label: "연락처", required: true, visible: true, includeInNotification: true },
  { key: "unitType", type: "checkbox", label: "관심 타입", required: true, visible: true, includeInNotification: true, options: ["84A", "84B"] },
  { key: "inquiry", type: "textarea", label: "문의", required: false, visible: true, includeInNotification: true },
  { key: "extra-1", type: "select", label: "방문 희망", required: true, visible: true, includeInNotification: true, options: ["평일", "주말"] },
  { key: "hidden", type: "text", label: "숨김", required: false, visible: false, includeInNotification: false },
];

describe("sanitizeLeadAnswers", () => {
  it("keeps allowed visible answers and drops name/phone/hidden/unknown", () => {
    const next = sanitizeLeadAnswers(fields, {
      name: "홍길동",
      phone: "010",
      unitType: ["84A"],
      inquiry: "문의합니다",
      "extra-1": "평일",
      hidden: "비밀",
      unknown: "x",
    });
    expect(next).toEqual({
      unitType: ["84A"],
      inquiry: "문의합니다",
      "extra-1": "평일",
    });
  });

  it("rejects missing required and invalid options", () => {
    expect(() => sanitizeLeadAnswers(fields, { unitType: ["84A"] })).toThrow(ApiError);
    expect(() => sanitizeLeadAnswers(fields, { unitType: ["84A"], "extra-1": "야간" })).toThrow(ApiError);
  });
});

describe("formatLeadAnswers", () => {
  it("uses form field labels when provided", () => {
    const rows = formatLeadAnswers({ "extra-1": "평일", unitType: ["84A"] }, fields);
    expect(rows).toEqual([
      { key: "extra-1", label: "방문 희망", text: "평일" },
      { key: "unitType", label: "관심 타입", text: "84A" },
    ]);
  });
});
