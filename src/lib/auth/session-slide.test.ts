import { addDays, addHours, subDays } from "date-fns";
import { describe, expect, it } from "vitest";
import { isSessionPastAbsolute, shouldSlideSession } from "@/lib/auth/session";
import { SESSION_ABSOLUTE_DAYS, SESSION_TTL_DAYS } from "@/lib/constants";

describe("shouldSlideSession", () => {
  it("slides when less than half TTL remains", () => {
    const now = new Date("2026-01-15T00:00:00Z");
    const soon = addHours(now, 24);
    expect(shouldSlideSession(soon, now)).toBe(true);
  });

  it("does not slide when plenty of time remains", () => {
    const now = new Date("2026-01-15T00:00:00Z");
    const far = addDays(now, SESSION_TTL_DAYS);
    expect(shouldSlideSession(far, now)).toBe(false);
  });
});

describe("isSessionPastAbsolute", () => {
  it("rejects sessions older than absolute window", () => {
    const now = new Date("2026-01-15T00:00:00Z");
    expect(isSessionPastAbsolute(subDays(now, SESSION_ABSOLUTE_DAYS), now)).toBe(true);
    expect(isSessionPastAbsolute(subDays(now, SESSION_ABSOLUTE_DAYS - 1), now)).toBe(false);
  });
});
