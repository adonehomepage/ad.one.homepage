import { describe, expect, it } from "vitest";
import { RELAY_UPLOAD_MAX_BYTES, relayUploadLimitMessage } from "@/lib/uploads/limits";

describe("relay upload limit", () => {
  it("allows files at the limit", () => {
    expect(relayUploadLimitMessage("image/jpeg", RELAY_UPLOAD_MAX_BYTES)).toBeNull();
  });

  it("asks for a video URL when a video is too large", () => {
    expect(relayUploadLimitMessage("video/mp4", RELAY_UPLOAD_MAX_BYTES + 1)).toContain("영상 주소");
  });

  it("rejects other oversized files", () => {
    expect(relayUploadLimitMessage("application/pdf", RELAY_UPLOAD_MAX_BYTES + 1)).toContain("3.5MB");
  });
});
