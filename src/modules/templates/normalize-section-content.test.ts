import { describe, expect, it } from "vitest";
import {
  DIRECTIONS_ROUTE_MAX,
  FAQ_ITEM_MAX,
  FLOORPLAN_TYPE_MAX,
  GALLERY_IMAGE_MAX,
  HERO_GALLERY_MAX,
  HERO_TAG_MAX,
  LEAD_FORM_PERK_MAX,
  LEGAL_NOTICE_MAX,
  LOCATION_CARD_MAX,
  OVERVIEW_FACT_MAX,
  OVERVIEW_SCHEDULE_MAX,
  OVERVIEW_STAT_MAX,
  POPUP_PERK_MAX,
  PREMIUM_ITEM_MAX,
  FORM_FIELD_MAX,
  FORM_OPTION_MAX,
  isPlaceholderPartyName,
  normalizeFormSettings,
  normalizeGlobalSettings,
  normalizePrivacySettings,
  normalizeSectionContent,
  PRIVACY_FIELD_LIST_MAX,
  publicPartyName,
} from "@/modules/templates/definitions";
import type { PageSnapshot, ProjectPrivacyConfig } from "@/types";
import { clampLaunchExcludedSnapshot } from "@/modules/sections/duplicate";

describe("normalizeSectionContent", () => {
  it("clamps FAQ items", () => {
    const items = Array.from({ length: FAQ_ITEM_MAX + 3 }, (_, index) => ({ question: `q${index}`, answer: `a${index}` }));
    const next = normalizeSectionContent("faq", { items });
    expect((next.items as unknown[]).length).toBe(FAQ_ITEM_MAX);
  });

  it("clamps gallery and location images", () => {
    const images = Array.from({ length: GALLERY_IMAGE_MAX + 2 }, (_, index) => ({ url: `https://x/${index}.png` }));
    expect((normalizeSectionContent("gallery", { images }).images as unknown[]).length).toBe(GALLERY_IMAGE_MAX);
    expect((normalizeSectionContent("location", { images }).images as unknown[]).length).toBe(GALLERY_IMAGE_MAX);
  });

  it("clamps overview facts, schedule, and stats", () => {
    const facts = Array.from({ length: OVERVIEW_FACT_MAX + 5 }, (_, index) => ({ label: `f${index}`, value: `${index}` }));
    const schedule = Array.from({ length: OVERVIEW_SCHEDULE_MAX + 2 }, (_, index) => ({ label: `s${index}`, date: `${index}` }));
    const stats = Array.from({ length: OVERVIEW_STAT_MAX + 2 }, (_, index) => ({ value: `${index}`, label: `l${index}` }));
    const next = normalizeSectionContent("overview", { facts, schedule, stats });
    expect((next.facts as unknown[]).length).toBe(OVERVIEW_FACT_MAX);
    expect((next.schedule as unknown[]).length).toBe(OVERVIEW_SCHEDULE_MAX);
    expect((next.stats as unknown[]).length).toBe(OVERVIEW_STAT_MAX);
  });

  it("clamps floorplan types", () => {
    const types = Array.from({ length: FLOORPLAN_TYPE_MAX + 1 }, (_, index) => ({
      name: `t${index}`,
      images: Array.from({ length: GALLERY_IMAGE_MAX + 1 }, (_, imageIndex) => ({ url: String(imageIndex) })),
    }));
    const next = normalizeSectionContent("floorplan", { types });
    expect((next.types as unknown[]).length).toBe(FLOORPLAN_TYPE_MAX);
    expect(((next.types as Array<{ images: unknown[] }>)[0]?.images ?? []).length).toBe(GALLERY_IMAGE_MAX);
  });

  it("keeps a single hero image and clamps trust tags", () => {
    const images = Array.from({ length: HERO_GALLERY_MAX + 2 }, (_, index) => ({ url: `https://x/${index}.png` }));
    const trustTags = Array.from({ length: HERO_TAG_MAX + 3 }, (_, index) => ({ text: `t${index}` }));
    const next = normalizeSectionContent("hero", { images, trustTags });
    expect(next.imageUrl).toBe("https://x/0.png");
    expect((next.images as unknown[]).length).toBe(0);
    expect((next.trustTags as unknown[]).length).toBe(HERO_TAG_MAX);
  });

  it("clamps lead form perks", () => {
    const perks = Array.from({ length: LEAD_FORM_PERK_MAX + 2 }, (_, index) => ({ text: `p${index}` }));
    expect((normalizeSectionContent("lead_form", { perks }).perks as unknown[]).length).toBe(LEAD_FORM_PERK_MAX);
  });

  it("clamps location cards and directions routes", () => {
    const cards = Array.from({ length: LOCATION_CARD_MAX + 3 }, (_, index) => ({ title: `c${index}`, body: `b${index}` }));
    expect((normalizeSectionContent("location", { cards }).cards as unknown[]).length).toBe(LOCATION_CARD_MAX);
    const routes = Array.from({ length: DIRECTIONS_ROUTE_MAX + 2 }, (_, index) => ({ label: `r${index}`, detail: `d${index}` }));
    expect((normalizeSectionContent("directions", { routes }).routes as unknown[]).length).toBe(DIRECTIONS_ROUTE_MAX);
  });

  it("clamps premium items", () => {
    const items = Array.from({ length: PREMIUM_ITEM_MAX + 2 }, (_, index) => ({
      title: `t${index}`,
      body: `b${index}`,
      icon: "ocean-view-residence",
    }));
    expect((normalizeSectionContent("premium", { items }).items as unknown[]).length).toBe(PREMIUM_ITEM_MAX);
  });

  it("clamps legal notices", () => {
    const notices = Array.from({ length: LEGAL_NOTICE_MAX + 4 }, (_, index) => ({ text: `n${index}` }));
    expect((normalizeSectionContent("legal", { notices }).notices as unknown[]).length).toBe(LEGAL_NOTICE_MAX);
  });
});

describe("placeholder party names", () => {
  it("hides unsettled advertiser labels from public display", () => {
    expect(isPlaceholderPartyName("광고주명미정")).toBe(true);
    expect(publicPartyName("광고주명미정", "광고사명미정")).toBe("");
    expect(publicPartyName("광고주명미정", "애드잇")).toBe("애드잇");
  });
});

describe("normalizePrivacySettings", () => {
  it("trims and caps collected and third-party field lists", () => {
    const privacy = {
      collectingControllerName: " 애드잇 ",
      operatingCompanyName: "",
      advertisingAgencyName: "",
      advertiserCompanyName: "",
      collectionPurpose: "상담",
      collectedFields: Array.from({ length: PRIVACY_FIELD_LIST_MAX + 5 }, (_, index) => ` f${index} `),
      retentionDescription: "1년",
      privacyPolicyUrl: "/privacy",
      thirdPartyProvisionEnabled: true,
      thirdPartyFields: ["이름", "이름", "연락처"],
      refusalConsequence: "제한",
    } as ProjectPrivacyConfig;
    const next = normalizePrivacySettings(privacy);
    expect(next.collectingControllerName).toBe("애드잇");
    expect(next.collectedFields).toHaveLength(PRIVACY_FIELD_LIST_MAX);
    expect(next.thirdPartyFields).toEqual(["이름", "연락처"]);
  });
});

describe("normalizeFormSettings", () => {
  it("caps fields and options", () => {
    const form = {
      intro: "",
      successMessage: "",
      fields: Array.from({ length: FORM_FIELD_MAX + 3 }, (_, index) => ({
        key: `f${index}`,
        type: "select" as const,
        label: `필드 ${index}`,
        required: false,
        visible: true,
        includeInNotification: true,
        options: Array.from({ length: FORM_OPTION_MAX + 2 }, (_, optionIndex) => `옵션 ${optionIndex}`),
      })),
    } as PageSnapshot["formSettings"];
    const next = normalizeFormSettings(form);
    expect(next.fields).toHaveLength(FORM_FIELD_MAX);
    expect(next.fields[0]?.options).toHaveLength(FORM_OPTION_MAX);
  });
});

describe("normalizeGlobalSettings", () => {
  it("clamps popup perks", () => {
    const next = normalizeGlobalSettings({
      popup: { enabled: true, perks: Array.from({ length: POPUP_PERK_MAX + 2 }, (_, index) => `perk-${index}`) },
    });
    expect(((next.popup as { perks: unknown[] }).perks ?? []).length).toBe(POPUP_PERK_MAX);
  });
});

describe("clampLaunchExcludedSnapshot", () => {
  it("hides FAQ and clamps oversized content", () => {
    const snapshot = {
      projectName: "demo",
      publicSlug: "demo",
      globalSettings: { popup: { enabled: true, perks: ["a", "b", "c", "d"] } },
      sections: [
        {
          id: "faq",
          rootSectionId: "faq",
          sectionType: "faq",
          isVisible: true,
          showInGnb: true,
          content: { items: Array.from({ length: FAQ_ITEM_MAX + 2 }, (_, index) => ({ question: `q${index}`, answer: `a${index}` })) },
        },
        {
          id: "hero",
          rootSectionId: "hero",
          sectionType: "hero",
          isVisible: true,
          showInGnb: false,
          content: { images: Array.from({ length: HERO_GALLERY_MAX + 1 }, (_, index) => ({ url: String(index) })) },
        },
      ],
    } as unknown as PageSnapshot;
    const next = clampLaunchExcludedSnapshot(snapshot);
    expect(next.sections[0]).toMatchObject({ id: "faq", isVisible: false, showInGnb: false });
    expect((next.sections[0].content.items as unknown[]).length).toBe(FAQ_ITEM_MAX);
    expect(next.sections[1].content.imageUrl).toBe("0");
    expect((next.sections[1].content.images as unknown[]).length).toBe(0);
    expect(((next.globalSettings.popup as { perks: unknown[] }).perks ?? []).length).toBe(POPUP_PERK_MAX);
  });
});
