import type { PageSnapshot } from "@/types";
import type { PresaleLandingData } from "@midday/types/presale-landing";
import { presaleLandingDummyData } from "@midday/data/presale-landing-dummy";

export const MIDDAY_DATA_KEY = "middayPresaleData" as const;

/** 구버전·직방 카피 잔존 보조문구를 애드잇 OFFICIAL로 맞춘다. */
function scrubOfficialSubtitle(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "OFFICIAL";
  if (/HOGANGNONO\s*OFFICIAL/i.test(trimmed)) return "OFFICIAL";
  if (/호갱노노\s*OFFICIAL/i.test(trimmed)) return "OFFICIAL";
  return trimmed;
}

/** 저장된 전화 하이픈 깨짐(예: 051-7413-300)을 자리수 기준으로 복구 */
function normalizeKrPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (!d) return phone.trim();
  if (d.length === 11 && d.startsWith("010")) {
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (d.length === 9 && d.startsWith("02")) {
    return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  }
  if (d.length === 10 && d.startsWith("02")) {
    return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return phone.trim();
}

function normalizePhones(data: PresaleLandingData): PresaleLandingData {
  const phone = normalizeKrPhoneDisplay(data.gnb?.phone || data.footer?.phone || "");
  const order = (
    data.sectionOrder?.length
      ? [...data.sectionOrder]
      : [...presaleLandingDummyData.sectionOrder]
  ).filter((key) => key !== "whyZigbang" && key !== "faq");
  for (const key of ["register", "location"] as const) {
    if (!order.includes(key)) order.push(key);
  }
  return {
    ...data,
    skin: "midday",
    sectionOrder: order,
    visibleSections: {
      ...presaleLandingDummyData.visibleSections,
      ...data.visibleSections,
      whyZigbang: false,
      faq: false,
      product: true,
    },
    gnb: {
      ...data.gnb,
      phone: phone || data.gnb?.phone,
      navSubtitle: scrubOfficialSubtitle(data.gnb?.navSubtitle),
    },
    footer: {
      ...data.footer,
      phone: phone || data.footer?.phone,
      subtitle: scrubOfficialSubtitle(data.footer?.subtitle),
    },
    popup: { ...data.popup, phone: normalizeKrPhoneDisplay(data.popup?.phone || phone) },
    register: {
      ...data.register,
      bottomPhone: normalizeKrPhoneDisplay(data.register?.bottomPhone || phone),
    },
    location: {
      ...data.location,
      phone: normalizeKrPhoneDisplay(data.location?.phone || phone),
    },
  };
}

export function defaultMiddayPresaleData(): PresaleLandingData {
  return normalizePhones(structuredClone(presaleLandingDummyData));
}

export function readMiddayPresaleData(
  globalSettings: Record<string, unknown> | null | undefined,
): PresaleLandingData {
  const raw = globalSettings?.[MIDDAY_DATA_KEY];
  if (raw && typeof raw === "object") {
    return normalizePhones(raw as PresaleLandingData);
  }
  return defaultMiddayPresaleData();
}

export function withMiddayPresaleData(
  globalSettings: Record<string, unknown>,
  data: PresaleLandingData,
): Record<string, unknown> {
  return {
    ...globalSettings,
    [MIDDAY_DATA_KEY]: { ...data, skin: "midday" },
    siteName: data.gnb?.siteName || globalSettings.siteName,
    phone: data.gnb?.phone || globalSettings.phone,
    logoUrl: data.gnb?.logoUrl || globalSettings.logoUrl,
  };
}

export function applySiteIdentity(
  data: PresaleLandingData,
  input: { siteName?: string; phone?: string },
): PresaleLandingData {
  const next = normalizePhones(structuredClone(data));
  if (input.siteName?.trim()) {
    const siteName = input.siteName.trim();
    next.gnb.siteName = siteName;
    next.product.siteName = siteName;
    next.footer.siteName = siteName;
  }
  if (input.phone?.trim()) {
    const phone = normalizeKrPhoneDisplay(input.phone);
    next.gnb.phone = phone;
    next.footer.phone = phone;
    next.popup.phone = phone;
    next.register.bottomPhone = phone;
    next.location.phone = phone;
  }
  return next;
}

export function snapshotHasMiddayData(snapshot: PageSnapshot): boolean {
  return snapshot.templateCode === "midday" || snapshot.templateCode === "info";
}

/** 스냅샷 현장명·전화로 원본 더미/저장 데이터를 맞춘다 (렌더러는 그대로). */
export function readMiddayPresaleDataForSnapshot(snapshot: PageSnapshot): PresaleLandingData {
  return applySiteIdentity(readMiddayPresaleData(snapshot.globalSettings), {
    siteName: snapshot.projectName,
    phone: snapshot.phone,
  });
}
