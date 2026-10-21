import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-next";

describe("safeNextPath", () => {
  it("allows relative app paths with query", () => {
    expect(safeNextPath("/admin/projects")).toBe("/admin/projects");
    expect(safeNextPath("/admin/projects?status=DRAFT")).toBe("/admin/projects?status=DRAFT");
    expect(safeNextPath("/")).toBe("/");
  });

  it("blocks open redirects", () => {
    expect(safeNextPath("//evil.test")).toBe("/admin");
    expect(safeNextPath("https://evil.test")).toBe("/admin");
    expect(safeNextPath("/\\evil.test")).toBe("/admin");
    expect(safeNextPath("/%2F%2Fevil.test")).toBe("/admin");
    expect(safeNextPath(null)).toBe("/admin");
  });
});
