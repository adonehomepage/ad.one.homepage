import { describe, expect, it } from "vitest";
import { renderHangulPdfSample } from "@/modules/reports/pdf";

describe("report pdf", () => {
  it("embeds Hangul with Pretendard", async () => {
    const bytes = await renderHangulPdfSample("애드잇 현장");
    const body = Buffer.from(bytes);
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    expect(body.length).toBeGreaterThan(1_000);
    expect(body.length).toBeLessThan(1_500_000);
  });
});
