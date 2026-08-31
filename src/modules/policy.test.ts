import { describe, expect, it } from "vitest";
import { assertRecipientLimit } from "@/modules/recipients/rules";
import { ApiError } from "@/lib/errors";
import { sanitizeAnalyticsMetadata } from "@/modules/analytics/sanitize";
import { addCalendarMonths } from "@/lib/datetime";

describe("recipient limit", () => {
  it("rejects a 6th active recipient", () => {
    expect(() => assertRecipientLimit(5)).toThrow(ApiError);
  });
});

describe("analytics sanitization", () => {
  it("drops personal fields", () => {
    const clean = sanitizeAnalyticsMetadata({ name: "홍길동", phone: "01012345678", section: "hero" });
    expect(clean.name).toBeUndefined();
    expect(clean.phone).toBeUndefined();
    expect(clean.section).toBe("hero");
  });
});

describe("duration months", () => {
  it("uses the last valid day when adding a month to Jan 31", () => {
    const start = new Date(Date.UTC(2026, 0, 31, 6, 0, 0));
    const next = addCalendarMonths(start, 1);
    expect(next.getUTCMonth()).toBe(1);
    expect(next.getUTCDate()).toBe(28);
  });
});
