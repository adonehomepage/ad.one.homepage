import { describe, expect, it } from "vitest";
import { validateSlug } from "@/lib/validation/slug";

describe("slug validation", () => {
  it("accepts korean, english, numbers and hyphen", () => {
    expect(validateSlug("루미에르센트럴").ok).toBe(true);
    expect(validateSlug("lumiere-central").ok).toBe(true);
    expect(validateSlug("prime84").ok).toBe(true);
  });

  it("rejects reserved paths", () => {
    const result = validateSlug("admin");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SLUG_RESERVED");
  });

  it("rejects path-breaking characters", () => {
    expect(validateSlug("foo/bar").ok).toBe(false);
    expect(validateSlug("foo?x").ok).toBe(false);
  });

  it("treats case as the same lookup key", () => {
    const a = validateSlug("Lumiere");
    const b = validateSlug("lumiere");
    expect(a.ok && b.ok && a.lookupKey === b.lookupKey).toBe(true);
  });
});
