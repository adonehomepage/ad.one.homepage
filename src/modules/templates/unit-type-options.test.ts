import { describe, expect, it } from "vitest";
import { withUnitTypeOptions } from "@/modules/templates/definitions";
import type { LeadFormField } from "@/types";

function field(partial: Partial<LeadFormField> & Pick<LeadFormField, "key" | "type">): LeadFormField {
  return {
    label: partial.key,
    required: false,
    visible: true,
    includeInNotification: true,
    options: [],
    ...partial,
  };
}

describe("withUnitTypeOptions", () => {
  it("syncs options onto unitType and appends 미정", () => {
    const fields = [
      field({ key: "name", type: "name" }),
      field({ key: "unitType", type: "radio", options: ["이전"] }),
    ];
    const next = withUnitTypeOptions(fields, ["84㎡", "59㎡"]);
    expect(next.find((item) => item.key === "unitType")?.options).toEqual(["84㎡", "59㎡", "미정"]);
    expect(next.find((item) => item.key === "name")?.options).toEqual([]);
  });

  it("does not duplicate 미정", () => {
    const fields = [field({ key: "unitType", type: "select", options: ["이전"] })];
    expect(withUnitTypeOptions(fields, ["84㎡", "미정"])[0]?.options).toEqual(["84㎡", "미정"]);
  });

  it("clears options when type names are empty", () => {
    const fields = [field({ key: "unitType", type: "select", options: ["84㎡"] })];
    expect(withUnitTypeOptions(fields, [])[0]?.options).toEqual([]);
  });
});
