import { describe, expect, it } from "vitest";
import { formFieldsForLeadSubmit } from "@/modules/leads/unit-type-fields";
import type { LeadFormField, PageSnapshot } from "@/types";

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

function snapshot(partial: Partial<PageSnapshot> & Pick<PageSnapshot, "templateCode">): PageSnapshot {
  return {
    projectId: "p1",
    projectName: "테스트",
    publicSlug: "test",
    phone: "010-0000-0000",
    sections: [],
    globalSettings: {},
    formSettings: {
      fields: [
        field({ key: "unitType", type: "select", options: ["59㎡", "74㎡", "84㎡"] }),
        field({ key: "inquiry", type: "textarea" }),
      ],
    },
    privacy: {
      collectingControllerName: "테스트",
      operatingCompanyName: "",
      advertisingAgencyName: "",
      advertiserCompanyName: "",
      collectionPurpose: "",
      collectedFields: [],
      retentionDescription: "",
      privacyPolicyUrl: "",
      thirdPartyProvisionEnabled: false,
    },
    ...partial,
  } as PageSnapshot;
}

describe("formFieldsForLeadSubmit", () => {
  it("merges oak plan names and 미정 into unitType options", () => {
    const next = formFieldsForLeadSubmit(
      snapshot({
        templateCode: "oak-editorial",
        globalSettings: {
          oakEditorialData: {
            floorplan: {
              plans: [
                { id: "84A", name: "84A" },
                { id: "59A", name: "59A" },
              ],
            },
          },
        },
      }),
    );
    const options = next.find((item) => item.key === "unitType")?.options ?? [];
    expect(options).toContain("84A");
    expect(options).toContain("59A");
    expect(options).toContain("미정");
    expect(options).toContain("59㎡");
  });

  it("merges midday interest labels into unitType options", () => {
    const next = formFieldsForLeadSubmit(
      snapshot({
        templateCode: "info",
        globalSettings: {
          middayPresaleData: {
            floorplan: {
              types: [{ id: "1", tabLabel: "58A", typeLabel: "TYPE 58A", title: "전용 59㎡" }],
            },
            product: { interestTypes: [] },
          },
        },
      }),
    );
    const options = next.find((item) => item.key === "unitType")?.options ?? [];
    expect(options.some((item) => item.includes("58A"))).toBe(true);
    expect(options).toContain("미정");
  });
});
