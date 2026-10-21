import { describe, expect, it } from "vitest";
import { validatePasswordStrength } from "@/lib/auth/password-rules";

describe("validatePasswordStrength", () => {
  it("rejects short or single-type passwords", () => {
    expect(validatePasswordStrength("Ab1")).toBeTruthy();
    expect(validatePasswordStrength("abcdefghij")).toBeTruthy();
    expect(validatePasswordStrength("1234567890")).toBeTruthy();
  });

  it("accepts mixed passwords of length 10+", () => {
    expect(validatePasswordStrength("abcdefghi1")).toBeNull();
    expect(validatePasswordStrength("Password12")).toBeNull();
  });
});
