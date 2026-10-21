import { describe, expect, it } from "vitest";
import { mimeMatchesSniff, sniffMime } from "@/lib/uploads/sniff";

describe("sniffMime", () => {
  it("detects jpeg png gif pdf", () => {
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffMime(Buffer.from("GIF89a...."))).toBe("image/gif");
    expect(sniffMime(Buffer.from("%PDF-1.4"))).toBe("application/pdf");
  });

  it("rejects mismatched image mime", () => {
    expect(mimeMatchesSniff("image/png", "image/jpeg")).toBe(false);
    expect(mimeMatchesSniff("image/jpeg", "image/jpeg")).toBe(true);
    expect(mimeMatchesSniff("video/mp4", "video/webm")).toBe(true);
  });
});
