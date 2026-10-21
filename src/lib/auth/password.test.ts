import { describe, expect, it } from "vitest";
import { validatePasswordStrength } from "@/lib/auth/password-rules";

describe("validatePasswordStrength", () => {
  it("requires length and mixed characters", () => {
    expect(validatePasswordStrength("short1")).toBeTruthy();
    expect(validatePasswordStrength("onlyletters")).toBeTruthy();
    expect(validatePasswordStrength("1234567890")).toBeTruthy();
    expect(validatePasswordStrength("goodPass12")).toBeNull();
  });
});
