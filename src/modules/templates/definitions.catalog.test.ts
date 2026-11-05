import { describe, expect, it } from "vitest";
import { TEMPLATE_CODES } from "@/lib/constants";
import { templateCatalog } from "@/modules/templates/definitions";

describe("templateCatalog", () => {
  it("exposes foreon, info, oak-editorial in the picker; midday code remains in TEMPLATE_CODES", () => {
    const catalog = templateCatalog();
    expect(TEMPLATE_CODES).toEqual(["foreon", "info", "midday", "oak-editorial"]);
    expect(catalog.map((item) => item.code)).toEqual(["foreon", "info", "oak-editorial"]);
    expect(catalog.every((item) => item.comingSoon === false)).toBe(true);
    const info = catalog.find((item) => item.code === "info");
    expect(info?.name).toBe("프리미엄 화보형");
    expect(info?.description).toContain("히어로");
    expect(catalog.find((item) => item.code === "midday")).toBeUndefined();
    expect(catalog.find((item) => item.code === "oak-editorial")?.name).toContain("내추럴");
  });
});
