import { describe, expect, it } from "vitest";
import { displayPhone, formatPhoneInput, isEmail, isKoreanMobile, normalizePhone } from "@/lib/validation/phone";

describe("phone helpers", () => {
  it("normalizes +82 mobile", () => {
    expect(normalizePhone("+82 10-1234-5678")).toBe("01012345678");
    expect(isKoreanMobile("010-1234-5678")).toBe(true);
    expect(isKoreanMobile("02-123-4567")).toBe(false);
  });

  it("formats input and display", () => {
    expect(formatPhoneInput("01012345678")).toBe("010-1234-5678");
    expect(displayPhone("01012345678")).toBe("010-1234-5678");
  });

  it("checks email shape", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("bad")).toBe(false);
  });
});
