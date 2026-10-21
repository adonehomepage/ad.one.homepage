import { describe, expect, it } from "vitest";
import { createPreviewToken, verifyPreviewToken } from "@/lib/auth/preview-token";

describe("preview token", () => {
  it("round-trips a valid token", () => {
    const token = createPreviewToken("proj-1", 1_000_000);
    expect(verifyPreviewToken(token, 1_000_000)).toEqual({ projectId: "proj-1", expiresAt: 1_000_000 + 2 * 60 * 60 * 1000 });
  });

  it("rejects expired and tampered tokens", () => {
    const token = createPreviewToken("proj-1", 1_000_000);
    expect(verifyPreviewToken(token, 1_000_000 + 3 * 60 * 60 * 1000)).toBeNull();
    expect(verifyPreviewToken(token.slice(0, -2) + "xx", 1_000_000)).toBeNull();
  });
});
