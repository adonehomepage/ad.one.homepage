import { describe, expect, it } from "vitest";
import { normalizeSlug, validateSlug } from "@/lib/validation/slug";

describe("validateSlug", () => {
  it("accepts korean and latin hyphens", () => {
    expect(validateSlug("lumiere-central").ok).toBe(true);
    expect(validateSlug("래미안-센트럴").ok).toBe(true);
  });

  it("rejects empty, path chars, and reserved paths", () => {
    expect(validateSlug("").ok).toBe(false);
    expect(validateSlug("bad/slug").ok).toBe(false);
    expect(validateSlug("bad?x").ok).toBe(false);
    expect(validateSlug("admin").ok).toBe(false);
    expect(validateSlug("login").ok).toBe(false);
    expect(validateSlug("verify-recipient").ok).toBe(false);
  });

  it("strips internal spaces then validates", () => {
    expect(validateSlug("bad slug").ok).toBe(true);
    expect(normalizeSlug("bad slug")).toBe("badslug");
  });

  it("normalizes whitespace trim", () => {
    expect(normalizeSlug("  a-b  ")).toBe("a-b");
  });
});
