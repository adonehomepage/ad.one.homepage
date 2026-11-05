"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { DndContext, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pin } from "lucide-react";
import { heroGalleryImages, isDefaultSampleLogo, isPlaceholderPartyName, isPopupEnabled, POPUP_PERK_MAX, unitTypeNames, withLinkedSiteName, withUnitTypeOptions } from "@/modules/templates/definitions";
import { collectPublishErrors } from "@/modules/publishing/validate-publish";
import {
  canDuplicate,
  clampLaunchExcludedSection,
  countCopiesForRoot,
  duplicateSection,
  isLaunchExcludedSectionType,
  pinSectionOrder,
  removeCloneSection,
} from "@/modules/sections/duplicate";
import { MAX_SECTION_COPIES_PER_ORIGINAL } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { formatPhoneInput } from "@/lib/validation/phone";
import { LandingPage } from "@/modules/templates/render/landing-page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogBody, DialogFooter, DialogHeader, DialogShell } from "@/components/ui/dialog-shell";
import { useDialogFocusTrap } from "@/lib/a11y/dialog-focus";
import { CheckpointDialog } from "@/modules/editor/checkpoint-dialog";
import { PrivacySettingsDialog } from "@/modules/editor/privacy-settings-dialog";
import { UploadError, uploadProjectFile } from "@/modules/editor/prepare-upload";
import { displayChrome, orgText } from "@/modules/admin/org-copy";
import type { CanvasEdit } from "@/modules/editor/edit-context";
import type { PageSection, PageSnapshot } from "@/types";
import { readMiddayPresaleDataForSnapshot } from "@/modules/templates/midday-origin/midday-data";
import { resolveInterestTypeFormOptions } from "@/modules/templates/midday-origin/lib/presale-landing-normalize";
import {
  PRESALE_SECTION_DOM_IDS,
  PRESALE_SECTION_LABELS,
  type PresaleLandingData,
  type PresaleSectionKey,
} from "@/modules/templates/midday-origin/types/presale-landing";
import { OAK_DATA_KEY } from "@/modules/templates/oak-editorial/types";
import type { OakEditorialData } from "@/modules/templates/oak-editorial/types";
import { oakSectionContents } from "@/modules/templates/oak-editorial/oak-data";

function isOriginSkinCode(code: string | undefined) {
  return code === "midday" || code === "info";
}

function syncOakSectionsFromData(sections: PageSection[], oakData: OakEditorialData): PageSection[] {
  const parts = oakSectionContents(oakData);
  return sections.map((section) => {
    if (!section.isOriginal) return section;
    const part = parts[section.sectionType];
    if (!part) return section;
    return { ...section, content: { ...part } };
  });
}

function persistMiddayData(
  persistFn: (sections: PageSection[], extra?: { globalSettings?: Record<string, unknown> }) => void,
  sections: PageSection[],
  globalSettings: Record<string, unknown>,
  middayData: PresaleLandingData,
) {
  persistFn(sections, {
    globalSettings: {
      ...globalSettings,
      middayPresaleData: middayData,
      siteName: middayData.gnb?.siteName || globalSettings.siteName,
      phone: middayData.gnb?.phone || globalSettings.phone,
      logoUrl: middayData.gnb?.logoUrl || globalSettings.logoUrl,
      popup: {
        ...((globalSettings.popup as Record<string, unknown> | undefined) ?? {}),
        enabled: Boolean(middayData.popup?.enabled),
      },
    },
  });
}

/** 직방과 동일: 상품 상단·법적 고지만 순서 고정. 관심고객 등록은 노출 필수여도 순서 변경 가능. */
function isOrderPinnedSection(section: Pick<PageSection, "sectionType">) {
  return section.sectionType === "hero" || section.sectionType === "legal";
}

/** 법적 고지는 푸터라 섹션 목록에 넣지 않는다(직방 footer와 동일). */
function sidebarSections(sections: PageSection[]) {
  return sections.filter((section) => section.sectionType !== "legal");
}

/** 저장 상태 표시는 서버 요청과 연결한다. draft globalSettings 문구로 덮어쓰지 않는다. */
const STATUS_LABEL: Record<string, string> = {
  loading: "불러오는 중",
  pending: "저장 대기",
  saving: "저장 중",
  draft_saved: "작업본 저장됨",
  saved: "저장됨",
  save_failed: "저장 실패",
  publishing: "발행 중",
  published: "발행됨",
};

function shellText(settings: Record<string, unknown> | undefined, key: string, fallback: string) {
  return displayChrome(String(settings?.[key] ?? ""), fallback);
}

/** 출시 범위에서 제외된 FAQ·독립 gallery. 다시 표시·복제하지 않는다.
 * oak-editorial FAQ는 템플릿 본문이므로 예외. */
function isLaunchExcludedSection(section: PageSection, templateCode?: string) {
  if (templateCode === "oak-editorial" && section.sectionType === "faq") return false;
  if (section.sectionType === "faq" && (section.content as { oak?: boolean } | undefined)?.oak) return false;
  return isLaunchExcludedSectionType(section.sectionType);
}

function showStatus(status: string) {
  return STATUS_LABEL[status] ?? status;
}

function PreviewModeBanner({ hiddenCount, settings }: { hiddenCount: number; settings: Record<string, unknown> }) {
  const hidden = shellText(settings, "shellHiddenCount", "숨긴 섹션 {count}개").replace("{count}", String(hiddenCount));
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-b border-[#d8e0f0] bg-gradient-to-b from-primary-soft to-[#e8eef9] px-5 py-2.5 text-center text-[13px] font-semibold text-text-body"
    >
      <p>{shellText(settings, "shellPreviewBanner", "고객에게 보이는 화면입니다. 문구·이미지는 「편집 계속」에서 수정하세요.")}</p>
      {hiddenCount > 0 ? (
        <span className="inline-flex h-6 items-center rounded-full border border-border bg-white/85 px-2.5 text-[11px] font-bold text-text-muted">
          {hidden}
        </span>
      ) : null}
    </div>
  );
}

function EditModeBanner({ settings }: { settings: Record<string, unknown> }) {
  // SSR/CSR 첫 페인트는 닫힌 상태. localStorage는 mount 후에만 읽어 hydration 불일치를 막는다.
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem("adone-edit-hint") !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);
  if (!open) return null;
  function dismiss() {
    try {
      window.localStorage.setItem("adone-edit-hint", "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-b border-border bg-gradient-to-b from-primary-soft to-[#e8f3ff] px-5 py-2.5 text-center text-[13px] font-semibold text-text-body"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" className="shrink-0 text-primary" aria-hidden>
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="M13 13l6 6" />
      </svg>
      <p>
        문구·이미지를 <strong className="font-extrabold text-text-primary">클릭</strong>하면 바로 수정할 수 있습니다. 섹션 순서·노출은 왼쪽 패널에서 조절하세요.
      </p>
      <button
        type="button"
        className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-primary/30 bg-white/90 px-3 text-xs font-extrabold text-primary hover:bg-white"
        onClick={dismiss}
      >
        {shellText(settings, "shellEditHintOk", "확인")}
      </button>
      <button type="button" className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-white/70" aria-label={shellText(settings, "shellClose", "닫기")} onClick={dismiss}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ViewportIcon({ id }: { id: "desktop" | "tablet" | "mobile" }) {
  if (id === "desktop") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  if (id === "tablet") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

const SECTION_NAME: Record<string, [string, string]> = {
  hero: ["shellSectionHero", "상품 상단"],
  overview: ["shellSectionOverview", "사업개요"],
  location: ["shellSectionLocation", "입지조건"],
  premium: ["shellSectionPremium", "프리미엄"],
  gallery: ["shellSectionGallery", "갤러리"],
  floorplan: ["shellSectionFloorplan", "평면안내"],
  faq: ["shellSectionFaq", "FAQ"],
  directions: ["shellSectionDirections", "오시는 길"],
  lead_form: ["shellSectionLead", "관심고객 등록"],
  legal: ["shellSectionLegal", "법적 고지"],
};

function sectionLabel(settings: Record<string, unknown> | undefined, type: string) {
  const item = SECTION_NAME[type];
  return item ? shellText(settings, item[0], item[1]) : type;
}

function isPlaceholderText(value: string, settings?: Record<string, unknown>) {
  const text = value.trim();
  if (!text) return false;
  const mark = shellText(settings, "seedPlaceholderMark", "입력하세요");
  const sample = shellText(settings, "seedSampleComplex", "샘플 단지");
  const region1 = shellText(settings, "phRegion1", "시·도");
  const region2 = shellText(settings, "phRegion2", "시·군·구");
  return (mark ? text.includes(mark) : false) || text === sample || text === region1 || text === region2;
}

function countPlaceholder(value: unknown, settings?: Record<string, unknown>): number {
  if (typeof value === "string") return isPlaceholderText(value, settings) ? 1 : 0;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + countPlaceholder(item, settings), 0);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).reduce<number>((sum, item) => sum + countPlaceholder(item, settings), 0);
  }
  return 0;
}

function filledUrls(value: unknown) {
  if (!Array.isArray(value)) return 0;
  return value.filter((item) => String((item as { url?: string }).url ?? "").trim()).length;
}

function fillNote(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce((text, [key, value]) => text.split(`{${key}}`).join(String(value)), template);
}

function missingImageNote(section: PageSection, settings: Record<string, unknown>, templateCode?: string) {
  const content = section.content;
  const name = section.title || sectionLabel(settings, section.sectionType);
  if (templateCode === "oak-editorial") {
    if (section.sectionType === "hero") {
      const photos = Array.isArray(content.photos) ? (content.photos as Array<{ src?: string }>) : [];
      if (!photos.some((p) => String(p.src ?? "").trim())) {
        return fillNote(shellText(settings, "noteHeroMedia", "{name}에 대표 이미지가 없습니다."), { name });
      }
      return null;
    }
    if (section.sectionType === "premium") {
      const items = Array.isArray(content.items) ? (content.items as Array<{ imageUrl?: string }>) : [];
      if (!items.some((item) => String(item.imageUrl ?? "").trim())) {
        return fillNote(shellText(settings, "notePhotos", "{name}에 사진이 없습니다."), { name });
      }
      return null;
    }
    if (section.sectionType === "floorplan") {
      const plans = Array.isArray(content.plans)
        ? (content.plans as Array<{ floorplanImageUrl?: string }>)
        : [];
      const empty = plans.filter((p) => !String(p.floorplanImageUrl ?? "").trim()).length;
      if (empty > 0) {
        return fillNote(shellText(settings, "noteFloorplan", "{name}에 도면이 없는 타입이 {count}개 있습니다."), {
          name,
          count: empty,
        });
      }
      return null;
    }
    if (section.sectionType === "location") {
      if (!String(content.mapImageUrl ?? "").trim()) {
        return fillNote(shellText(settings, "noteMap", "{name}에 약도 이미지가 없습니다."), { name });
      }
      return null;
    }
    return null;
  }
  if (section.sectionType === "hero") {
    const hasMedia = String(content.imageUrl ?? "").trim() || heroGalleryImages(content).length > 0;
    if (!hasMedia) return fillNote(shellText(settings, "noteHeroMedia", "{name}에 대표 이미지가 없습니다."), { name });
  }
  if (section.sectionType === "gallery" && filledUrls(content.images) === 0) return fillNote(shellText(settings, "notePhotos", "{name}에 사진이 없습니다."), { name });
  if (section.sectionType === "location" && filledUrls(content.images) === 0) return fillNote(shellText(settings, "notePhotos", "{name}에 사진이 없습니다."), { name });
  if (section.sectionType === "premium") {
    const cards = Array.isArray(content.cards) ? (content.cards as Array<{ imageUrl?: string }>) : [];
    const items = Array.isArray(content.items) ? (content.items as Array<{ imageUrl?: string }>) : [];
    const cardImages = cards.filter((item) => String(item.imageUrl ?? "").trim()).length;
    const itemImages = items.filter((item) => String(item.imageUrl ?? "").trim()).length;
    if (filledUrls(content.images) + cardImages + itemImages === 0) return fillNote(shellText(settings, "notePhotos", "{name}에 사진이 없습니다."), { name });
  }
  if (section.sectionType === "floorplan") {
    const types = (content.types as Array<{ imageUrl?: string; images?: Array<{ url?: string }> }> | undefined) ?? [];
    const empty = types.filter((type) => filledUrls(type.images) === 0 && !String(type.imageUrl ?? "").trim()).length;
    if (empty > 0) return fillNote(shellText(settings, "noteFloorplan", "{name}에 도면이 없는 타입이 {count}개 있습니다."), { name, count: empty });
  }
  if (section.sectionType === "directions" && !String(content.mapImageUrl ?? "").trim()) return fillNote(shellText(settings, "noteMap", "{name}에 약도 이미지가 없습니다."), { name });
  return null;
}

function publishNotes(snapshot: PageSnapshot, verifiedRecipientCount?: number | null) {
  const settings = snapshot.globalSettings;
  const notes: string[] = [];
  const isOriginSkin = isOriginSkinCode(snapshot.templateCode);
  const isOak = snapshot.templateCode === "oak-editorial";
  // midday/info·oak는 원본/oak 데이터로 렌더하므로 섹션 행 기준 안내 문장·이미지 경고는 건너뛴다.
  // (체크리스트가 oak 전용 항목을 따로 본다.)
  if (!isOriginSkin && !isOak) {
    for (const section of snapshot.sections) {
      if (!section.isVisible) continue;
      const count = countPlaceholder(section.content, settings);
      if (count > 0) notes.push(fillNote(shellText(settings, "notePlaceholders", "{name}에 안내 문장이 {count}곳 남아 있습니다."), { name: section.title || sectionLabel(settings, section.sectionType), count }));
      const imageNote = missingImageNote(section, settings, snapshot.templateCode);
      if (imageNote) notes.push(imageNote);
    }
  }
  const popup = snapshot.globalSettings.popup as { enabled?: boolean; imageUrl?: string } | undefined;
  if (!isOriginSkin && !isOak && isPopupEnabled(popup) && !String(popup?.imageUrl ?? "").trim()) {
    notes.push(shellText(settings, "notePopupImage", "팝업이 켜져 있지만 이미지가 없습니다."));
  }
  const form = snapshot.sections.find((section) => section.sectionType === "lead_form" && section.isVisible);
  const url = String(form?.content.externalRegisterUrl ?? "").trim();
  // oak·midday/info 내장 리드 폼은 페이지에서 바로 수집하므로 외부 주소 경고를 건너뛴다.
  if (form && !isOak && !isOriginSkin && !/^https?:\/\//i.test(url)) {
    notes.push(shellText(settings, "noteExternalForm", "외부 관심고객 주소가 없습니다. 등록 버튼은 이 페이지의 등록 화면으로 이동합니다. 실제 수집은 아직 시작하지 않습니다."));
  }
  if (verifiedRecipientCount === 0) {
    notes.push(shellText(settings, "noteNoVerifiedRecipients", "인증된 알림 수신자가 없습니다. 관심고객은 저장되지만 알림은 발송되지 않습니다."));
  }
  return notes;
}

function PublishChecklist({ snapshot, onOpen }: { snapshot: PageSnapshot; onOpen: (target: string) => void }) {
  const settings = snapshot.globalSettings;
  const hero = snapshot.sections.find((section) => section.sectionType === "hero");
  const directions = snapshot.sections.find((section) => section.sectionType === "directions");
  const location = snapshot.sections.find((section) => section.sectionType === "location");
  const legal = snapshot.sections.find((section) => section.sectionType === "legal");
  const floorplan = snapshot.sections.find((section) => section.sectionType === "floorplan");
  const address = String(directions?.content.address ?? "").trim();
  const notices = (legal?.content.notices as Array<{ text?: string }> | undefined) ?? [];
  const types = (floorplan?.content.types as Array<{ name?: string }> | undefined) ?? [];
  const oakData = settings[OAK_DATA_KEY] as OakEditorialData | undefined;
  const isOak = snapshot.templateCode === "oak-editorial";
  const isOrigin = isOriginSkinCode(snapshot.templateCode);
  const middayData = isOrigin ? readMiddayPresaleDataForSnapshot(snapshot) : null;
  const oakHeroOk =
    (Array.isArray(hero?.content.photos) &&
      (hero!.content.photos as Array<{ src?: string }>).some((p) => String(p.src ?? "").trim())) ||
    (oakData?.hero.photos ?? []).some((p) => String(p.src ?? "").trim());
  const oakPlans = Array.isArray(floorplan?.content.plans)
    ? (floorplan!.content.plans as Array<{ name?: string }>)
    : oakData?.floorplan.plans ?? [];
  const oakLocationOk =
    Boolean(String(location?.content.mapImageUrl ?? "").trim()) ||
    Boolean(String(oakData?.location.mapImageUrl ?? "").trim());
  const originHeroOk = Boolean(String(middayData?.product?.mainImage?.url ?? "").trim());
  const originFloorOk = (middayData?.floorplan?.types ?? []).some(
    (type) => String(type.tabLabel ?? type.typeLabel ?? type.title ?? "").trim().length > 0,
  );
  const legalBodyOk =
    Boolean(String(legal?.content.body ?? "").trim()) ||
    notices.some((notice) => String(notice.text ?? "").trim().length > 0) ||
    Boolean(String(legal?.content.footerNote ?? "").trim());
  const items = [
    { target: "hero", label: shellText(settings, "checkName", "현장명"), ok: snapshot.projectName.trim().length > 0 && snapshot.projectName !== shellText(settings, "phSite", "현장명") },
    { target: "hero", label: shellText(settings, "checkPhone", "대표 전화"), ok: snapshot.phone.trim().length > 0 },
    {
      target: "logo",
      label: shellText(settings, "checkLogo", "로고"),
      ok: !isDefaultSampleLogo(
        oakData?.logoUrl ||
          middayData?.gnb?.logoUrl ||
          String(snapshot.globalSettings.logoUrl ?? ""),
      ),
    },
    {
      target: "hero",
      label: shellText(settings, "checkHeroImage", "대표 이미지"),
      ok: isOak
        ? oakHeroOk
        : isOrigin
          ? originHeroOk ||
            String(hero?.content.imageUrl ?? "").trim().length > 0 ||
            (hero ? heroGalleryImages(hero.content).length > 0 : false)
          : String(hero?.content.imageUrl ?? "").trim().length > 0 ||
            (hero ? heroGalleryImages(hero.content).length > 0 : false),
    },
    isOak
      ? {
          target: "location",
          label: shellText(settings, "checkAddress", "입지·약도"),
          ok: oakLocationOk,
        }
      : isOrigin
        ? {
            target: "site",
            label: shellText(settings, "checkAddress", "입지·단지"),
            ok: Boolean(
              String(
                middayData?.overview?.rows?.find((row) => /위치|주소|입지/.test(row.label))?.value ??
                  middayData?.overview?.rows?.[1]?.value ??
                  "",
              ).trim(),
            ),
          }
      : {
          target: "directions",
          label: shellText(settings, "checkAddress", "주소"),
          ok: address.length > 0 && address !== shellText(settings, "seedDirectionsAddress", "현장 주소를 입력하세요."),
        },
    isOak
      ? {
          target: "legal",
          label: shellText(settings, "checkNotices", "푸터 안내"),
          ok:
            Boolean(String(legal?.content.copyright ?? "").trim()) ||
            Boolean(String(legal?.content.tagline ?? "").trim()) ||
            Boolean(String(legal?.content.credit ?? "").trim()) ||
            Boolean(oakData?.footer.copyright?.trim()) ||
            Boolean(oakData?.footer.tagline?.trim()),
        }
      : {
          target: "legal",
          label: shellText(settings, "checkParties", "시행 또는 시공"),
          ok:
            isOrigin ||
            String(legal?.content.developerName ?? "").trim().length > 0 ||
            String(legal?.content.builderName ?? "").trim().length > 0,
        },
    ...(isOak || isOrigin
      ? isOrigin
        ? [
            {
              target: "legal",
              label: shellText(settings, "checkNotices", "고지 문장"),
              ok: legalBodyOk,
            },
          ]
        : []
      : [
          {
            target: "legal",
            label: shellText(settings, "checkNotices", "고지 문장"),
            ok: notices.some((notice) => String(notice.text ?? "").trim().length > 0),
          },
        ]),
    {
      target: "floorplan",
      label: shellText(settings, "checkFloorplan", "평면 타입명"),
      ok: isOak
        ? oakPlans.some((type) => String(type.name ?? "").trim().length > 0)
        : isOrigin
          ? originFloorOk
          : types.some((type) => String(type.name ?? "").trim().length > 0),
    },
    {
      target: "privacy",
      label: shellText(settings, "checkPrivacy", "개인정보 처리 주체"),
      ok: snapshot.privacy.collectingControllerName.trim() !== "" && !isPlaceholderPartyName(snapshot.privacy.collectingControllerName),
    },
  ];
  const missing = items.filter((item) => !item.ok).length;
  const hasLabel = shellText(settings, "shellHas", "있음");
  const missingLabel = shellText(settings, "shellMissing", "없음");
  return (
    <div className="overflow-hidden rounded-[16px] border border-border" aria-labelledby="publish-checklist-title">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p id="publish-checklist-title" className="text-sm font-semibold text-text-primary">
          {shellText(settings, "shellChecklistTitle", "발행 전에 확인할 것")}
        </p>
        <p className="shrink-0 text-xs text-text-muted" role="status" aria-live="polite">
          {shellText(settings, "shellChecklistMissingCount", "없는 항목 {count}개").replace("{count}", String(missing))}
        </p>
      </div>
      <ul className="border-t border-border">
        {items.map((item, index) => (
          <li key={`${item.target}-${index}`} className="border-b border-border last:border-b-0">
            <button
              type="button"
              className="flex min-h-9 w-full items-center justify-between gap-3 px-4 text-left text-sm hover:bg-surface"
              aria-label={`${item.label}: ${item.ok ? hasLabel : missingLabel}`}
              onClick={() => onOpen(item.target)}
            >
              <span className="text-text-primary">{item.label}</span>
              <span
                className={cn(
                  "inline-flex shrink-0 rounded-[8px] px-2.5 py-1 text-xs font-medium",
                  item.ok ? "bg-primary-soft text-primary-soft-foreground" : "bg-surface text-text-muted",
                )}
              >
                {item.ok ? hasLabel : missingLabel}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type HistoryEntry = {
  sections: PageSection[];
  globalSettings: Record<string, unknown>;
  formSettings: PageSnapshot["formSettings"];
  seoSettings: PageSnapshot["seoSettings"];
  privacySettings: PageSnapshot["privacy"];
};

type DraftResponse = {
  project: {
    id: string;
    name: string;
    publicSlug: string;
    status: string;
    publishedAt?: string | Date | null;
    draftRevision: number;
    hasUnpublishedChanges: boolean;
  };
  template: { code: PageSnapshot["templateCode"]; name: string };
  draft: {
    revision: number;
    globalSettings: Record<string, unknown>;
    formSettings: PageSnapshot["formSettings"];
    seoSettings: PageSnapshot["seoSettings"];
    privacySettings: PageSnapshot["privacy"];
  };
  sections: PageSection[];
};

function CopyPublicLink({ slug, settings, compact = false }: { slug: string; settings: Record<string, unknown>; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Button
      variant="ghost"
      aria-live="polite"
      className={compact ? "h-auto border-0 bg-transparent px-0 text-xs font-medium text-text-muted hover:bg-transparent hover:text-text-primary" : undefined}
      onClick={() => {
        const url = `${window.location.origin}/${slug}`;
        void navigator.clipboard
          .writeText(url)
          .then(() => {
            setFailed(false);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => {
            setCopied(false);
            setFailed(true);
            window.setTimeout(() => setFailed(false), 2000);
          });
      }}
    >
      {failed
        ? shellText(settings, "copyFailLabel", "복사 실패")
        : copied
          ? shellText(settings, "copyOkLabel", "주소를 복사했습니다")
          : shellText(settings, "shellCopy", "주소 복사")}
    </Button>
  );
}

/** 한 칸 이동한 순서를 만든다. 히어로·법적 고지 고정 때문에 결과가 그대로면 null. */
function sectionsAfterMove(list: PageSection[], sectionId: string, direction: -1 | 1): PageSection[] | null {
  const from = list.findIndex((section) => section.id === sectionId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= list.length) return null;
  const next = pinSectionOrder(arrayMove(list, from, to));
  return next.some((section, index) => section.id !== list[index]?.id) ? next : null;
}

function scrollToSection(anchorId: string) {
  const node = document.getElementById(anchorId);
  const scroller = node?.closest("[data-preview-scroll]");
  if (node && scroller instanceof HTMLElement) {
    // 상단 고정 헤더가 제목을 가리지 않게 실제 헤더 높이만큼 띄운다. 헤더를 못 찾으면 72px.
    const header = scroller.querySelector("[data-site-header], header");
    const offset = header instanceof HTMLElement ? header.offsetHeight + 12 : 72;
    const top = node.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - offset;
    scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    return;
  }
  node?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionSwitch({ checked, label, title, onClick }: { checked: boolean; label: string; title?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title ?? label}
      className={`relative h-5 w-[34px] shrink-0 cursor-pointer rounded-full ${checked ? "bg-primary" : "bg-border"}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white ${checked ? "left-4" : "left-0.5"}`} />
    </button>
  );
}

function SortableRow({
  section,
  selected,
  viewed,
  settings,
  canMoveUp,
  canMoveDown,
  onToggle,
  onSelect,
  onMove,
  templateCode,
}: {
  section: PageSection;
  selected: boolean;
  viewed: boolean;
  settings: Record<string, unknown>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onMove: (sectionId: string, direction: -1 | 1) => void;
  templateCode?: string;
}) {
  const orderPinned = isOrderPinnedSection(section);
  const canToggle = !section.isRequired;
  const launchExcluded =
    isLaunchExcludedSectionType(section.sectionType) &&
    !(templateCode === "oak-editorial" && section.sectionType === "faq");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id, disabled: orderPinned });
  const title = section.isOriginal ? section.title : `${section.title} ${shellText(settings, "shellCopySuffix", "복제")}`;
  const moveClass =
    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-border bg-white text-xs font-bold text-text-body hover:bg-surface disabled:cursor-not-allowed disabled:opacity-35 lg:hidden";
  const rowTone = selected ? "bg-primary text-white" : viewed ? "bg-primary-soft text-primary" : "text-text-body hover:bg-surface";
  const dragTone = selected ? "text-white/80 hover:text-white" : "text-text-muted hover:text-text-body";
  const pinTone = selected ? "text-white/80" : "text-text-muted";
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex min-h-[36px] items-center gap-1.5 rounded-[14px] px-0.5 ${section.isVisible ? "" : "opacity-55"} ${isDragging ? "z-10 opacity-80 shadow-sm ring-1 ring-primary/30" : ""}`}
    >
      {orderPinned ? (
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center ${pinTone}`} title={shellText(settings, "shellPinned", "고정")} aria-hidden>
          <Pin size={12} strokeWidth={2.25} />
        </span>
      ) : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className={`inline-flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-[10px] active:cursor-grabbing ${dragTone}`}
          aria-label={shellText(settings, "shellDragHandle", "드래그하여 순서 변경")}
          title={shellText(settings, "shellDragHandle", "드래그하여 순서 변경")}
        >
          <GripVertical size={14} strokeWidth={2} aria-hidden />
        </button>
      )}
      <button
        type="button"
        aria-current={selected ? "true" : undefined}
        className={`min-w-0 flex-1 truncate rounded-[14px] px-2.5 py-1.5 text-left text-xs font-semibold ${rowTone} ${orderPinned ? "cursor-pointer" : "cursor-grab touch-none active:cursor-grabbing"}`}
        onClick={onSelect}
        // 이름 줄을 잡아끌어도 순서가 바뀌게 한다. 클릭만 하면 해당 섹션으로 이동한다.
        {...(orderPinned ? {} : { ...attributes, ...listeners })}
      >
        {title}
      </button>
      {orderPinned ? null : (
        <>
          <button
            type="button"
            className={moveClass}
            disabled={!canMoveUp}
            aria-label={shellText(settings, "shellMoveUp", "{name} 위로").replace("{name}", section.title)}
            onClick={() => onMove(section.id, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            className={moveClass}
            disabled={!canMoveDown}
            aria-label={shellText(settings, "shellMoveDown", "{name} 아래로").replace("{name}", section.title)}
            onClick={() => onMove(section.id, 1)}
          >
            ↓
          </button>
          {canToggle ? (
            launchExcluded && !section.isVisible ? (
              <span
                className="shrink-0 rounded-[8px] px-1.5 py-1 text-[10px] font-semibold text-text-muted"
                title={shellText(settings, "shellLaunchExcludedHint", "출시 범위에서 제외된 섹션입니다. 다시 표시할 수 없습니다.")}
              >
                {shellText(settings, "shellLaunchExcluded", "제외")}
              </span>
            ) : (
              <SectionSwitch
                checked={section.isVisible}
                label={
                  section.isVisible
                    ? shellText(settings, "shellHideNamed", "{name} 숨기기").replace("{name}", section.title)
                    : shellText(settings, "shellShowNamed", "{name} 다시 표시").replace("{name}", section.title)
                }
                title={
                  section.isVisible
                    ? shellText(settings, "shellHideHint", "페이지에서 가립니다. 내용은 남고 다시 표시할 수 있습니다.")
                    : shellText(settings, "shellShowHint", "숨긴 구간을 다시 페이지에 표시합니다.")
                }
                onClick={onToggle}
              />
            )
          ) : null}
        </>
      )}
    </div>
  );
}
type PopupSettingsValue = {
  enabled?: boolean;
  banner?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  perks?: string[];
  disclaimer?: string;
  phone?: string;
  hideTodayLabel?: string;
  phonePrefix?: string;
  closeLabel?: string;
  emptyImageLabel?: string;
};

function PopupField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-text-muted">{label}</span>
      {children}
    </label>
  );
}

function PopupSettings({
  popup,
  settings,
  onChange,
  onUpload,
  onPreview,
  showToggle = true,
}: {
  popup: PopupSettingsValue;
  settings: Record<string, unknown>;
  onChange: (popup: PopupSettingsValue) => void;
  onUpload: (file: File) => Promise<string>;
  onPreview: () => void;
  showToggle?: boolean;
}) {
  const [perkLimitMessage, setPerkLimitMessage] = useState("");
  const perks = popup.perks ?? [];
  const perkOverLimit = perks.length > POPUP_PERK_MAX;
  return (
    <div className="space-y-4">
      {showToggle ? (
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">{shellText(settings, "shellPopup", "이벤트 팝업")}</p>
            <p className="mt-0.5 text-xs text-text-muted">{shellText(settings, "shellPopupIntro", "방문 시 한 번 보이는 안내")}</p>
          </div>
          <SectionSwitch
            checked={isPopupEnabled(popup)}
            label={shellText(settings, "shellPopup", "이벤트 팝업")}
            onClick={() => onChange({ ...popup, enabled: !isPopupEnabled(popup) })}
          />
        </div>
      ) : null}
      {popup.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={popup.imageUrl} alt="" className="h-28 w-full rounded-[14px] object-cover" />
      ) : null}
      <div className="flex gap-2">
        <label className="flex h-11 flex-1 cursor-pointer items-center justify-center rounded-[14px] border border-border bg-white text-sm font-semibold hover:bg-surface">
          {shellText(settings, "shellPopupBanner", "배너 이미지")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              void onUpload(file).then((imageUrl) => onChange({ ...popup, imageUrl })).catch(() => undefined);
            }}
          />
        </label>
        {popup.imageUrl ? (
          <button type="button" className="h-11 rounded-[14px] border border-border px-3 text-xs font-semibold text-text-muted hover:bg-surface" onClick={() => onChange({ ...popup, imageUrl: "" })}>
            {shellText(settings, "mediaBannerDelete", "배너 삭제")}
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PopupField label={shellText(settings, "shellPopupBannerText", "배너 문구")}>
          <input className="ui-field" value={popup.banner ?? ""} placeholder={shellText(settings, "shellPopupBannerPh", "방문 고객 안내")} onChange={(event) => onChange({ ...popup, banner: event.target.value })} />
        </PopupField>
        <PopupField label={shellText(settings, "shellPopupCta", "버튼 문구")}>
          <input className="ui-field" value={popup.ctaLabel ?? ""} placeholder={shellText(settings, "shellPopupCtaPh", "관심고객 등록")} onChange={(event) => onChange({ ...popup, ctaLabel: event.target.value })} />
        </PopupField>
      </div>
      <PopupField label={shellText(settings, "shellPopupTitleField", "제목")}>
        <input className="ui-field" value={popup.title ?? ""} placeholder={shellText(settings, "shellPopupTitlePh", "관심고객으로 등록해 주세요")} onChange={(event) => onChange({ ...popup, title: event.target.value })} />
      </PopupField>
      <PopupField label={shellText(settings, "shellPopupBodyField", "본문")}>
        <textarea className="ui-field min-h-[4.5rem] py-2.5 text-sm" value={popup.body ?? ""} placeholder={shellText(settings, "shellPopupBodyPh", "상담 안내를 받으려면 이름과 연락처를 남겨 주세요.")} onChange={(event) => onChange({ ...popup, body: event.target.value })} />
      </PopupField>
      <PopupField label={shellText(settings, "shellPopupPerks", "혜택")}>
        <textarea
          className="ui-field min-h-[4.5rem] py-2.5 text-sm"
          value={perks.join("\n")}
          placeholder={shellText(settings, "shellPopupPerksPh", "한 줄에 하나씩 (최대 3줄)\n청약 일정 안내")}
          onChange={(event) => {
            const lines = event.target.value.split("\n");
            // 기존에 3개를 넘는 데이터는 유지하되, 새로 줄을 늘리는 입력만 막는다.
            if (lines.length > POPUP_PERK_MAX && lines.length > perks.length) {
              setPerkLimitMessage(
                shellText(settings, "shellPopupPerksLimit", "혜택은 최대 3줄까지 입력할 수 있습니다. 추가하려면 기존 줄을 줄인 뒤 다시 입력해 주세요."),
              );
              return;
            }
            setPerkLimitMessage(
              lines.length > POPUP_PERK_MAX
                ? shellText(settings, "shellPopupPerksExisting", "저장된 혜택이 3줄을 넘습니다. 공개 화면에는 앞의 3줄만 보이며, 여기서는 줄여서 정리할 수 있습니다.")
                : "",
            );
            onChange({ ...popup, perks: lines });
          }}
        />
        <p className="mt-1 text-[11px] text-text-muted">
          {shellText(settings, "shellPopupPerksHint", "혜택은 최대 3줄까지 입력할 수 있습니다. 한 줄에 하나씩 적습니다.")}
          {` (${Math.min(perks.length, POPUP_PERK_MAX)}/${POPUP_PERK_MAX})`}
        </p>
        {perkLimitMessage || perkOverLimit ? (
          <p className="mt-1 text-[11px] font-medium text-danger" role="status">
            {perkLimitMessage ||
              shellText(settings, "shellPopupPerksExisting", "저장된 혜택이 3줄을 넘습니다. 공개 화면에는 앞의 3줄만 보이며, 여기서는 줄여서 정리할 수 있습니다.")}
          </p>
        ) : null}
      </PopupField>
      <PopupField label={shellText(settings, "shellPopupDisclaimer", "안내 문장")}>
        <input className="ui-field" value={popup.disclaimer ?? ""} placeholder={shellText(settings, "shellPopupDisclaimerPh", "관심고객 등록은 청약 접수가 아닙니다.")} onChange={(event) => onChange({ ...popup, disclaimer: event.target.value })} />
      </PopupField>
      <div className="grid gap-3 sm:grid-cols-2">
        <PopupField label={shellText(settings, "shellPopupPhone", "팝업 전화")}>
          <input className="ui-field" value={popup.phone ?? ""} placeholder={shellText(settings, "shellPopupPhonePh", "비우면 대표 전화")} onChange={(event) => onChange({ ...popup, phone: event.target.value })} />
        </PopupField>
        <PopupField label={shellText(settings, "shellPopupPhonePrefix", "전화 앞 문구")}>
          <input className="ui-field" value={popup.phonePrefix ?? ""} placeholder={shellText(settings, "shellPopupPhonePrefixPh", "바로 상담")} onChange={(event) => onChange({ ...popup, phonePrefix: event.target.value })} />
        </PopupField>
        <PopupField label={shellText(settings, "shellPopupCloseField", "닫기")}>
          <input className="ui-field" value={popup.closeLabel ?? ""} placeholder={shellText(settings, "shellPopupClosePh", "닫기")} onChange={(event) => onChange({ ...popup, closeLabel: event.target.value })} />
        </PopupField>
        <PopupField label={shellText(settings, "shellPopupEmpty", "배너가 없을 때")}>
          <input className="ui-field" value={popup.emptyImageLabel ?? ""} placeholder={shellText(settings, "shellPopupEmptyPh", "배너 이미지")} onChange={(event) => onChange({ ...popup, emptyImageLabel: event.target.value })} />
        </PopupField>
        <PopupField label={shellText(settings, "shellPopupHideToday", "오늘 하루 보지 않기")}>
          <input className="ui-field" value={popup.hideTodayLabel ?? ""} placeholder={shellText(settings, "shellPopupHideTodayPh", "오늘 하루 보지 않기")} onChange={(event) => onChange({ ...popup, hideTodayLabel: event.target.value })} />
        </PopupField>
      </div>
      <Button type="button" variant="soft" className="w-full" onClick={onPreview}>
        {shellText(settings, "shellPopupPreview", "팝업 미리보기")}
      </Button>
    </div>
  );
}

/** 미리보기 프레임 안의 position:fixed 를 창이 아니라 보이는 프레임에 붙인다. */
function DeviceFrameMetrics() {
  const anchorRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const frame = anchorRef.current?.closest("[data-device-frame]");
    const scroller = document.querySelector("[data-preview-scroll]");
    const root = document.documentElement;
    const names = ["--device-top", "--device-left", "--device-right", "--device-bottom", "--device-width", "--device-height"] as const;
    const clear = () => names.forEach((name) => root.style.removeProperty(name));
    if (!(frame instanceof HTMLElement) || !(scroller instanceof HTMLElement)) return;
    const sync = () => {
      const fr = frame.getBoundingClientRect();
      const sr = scroller.getBoundingClientRect();
      const top = Math.max(fr.top, sr.top);
      const bottom = Math.min(fr.bottom, sr.bottom);
      const left = fr.left;
      const right = fr.right;
      root.style.setProperty("--device-top", `${top}px`);
      root.style.setProperty("--device-left", `${left}px`);
      root.style.setProperty("--device-right", `${right}px`);
      root.style.setProperty("--device-bottom", `${bottom}px`);
      root.style.setProperty("--device-width", `${Math.max(0, right - left)}px`);
      root.style.setProperty("--device-height", `${Math.max(0, bottom - top)}px`);
    };
    sync();
    scroller.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    const observer = new ResizeObserver(sync);
    observer.observe(frame);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      observer.disconnect();
      clear();
    };
  }, []);
  return <span ref={anchorRef} hidden />;
}

export function EditorShell({ projectId }: { projectId: string }) {
  const [data, setData] = useState<DraftResponse | null>(null);
  const [status, setStatus] = useState("loading");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile" | "split">("desktop");
  const [editing, setEditing] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupFromSettings, setPopupFromSettings] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [publishDone, setPublishDone] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [verifiedRecipientCount, setVerifiedRecipientCount] = useState<number | null>(null);
  const [publishBlockingErrors, setPublishBlockingErrors] = useState<string[]>([]);
  const [listOpen, setListOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const [popupFormOpen, setPopupFormOpen] = useState(false);
  const [viewedAnchor, setViewedAnchor] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [cloneDeleteConfirmOpen, setCloneDeleteConfirmOpen] = useState(false);
  const dataRef = useRef<DraftResponse | null>(null);
  const pendingRef = useRef<{ sections: PageSection[]; extra?: Partial<DraftResponse["draft"]> } | null>(null);
  const timerRef = useRef<number | null>(null);
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  // 연속 입력은 한 번의 실행 취소 단위로 묶는다. 묶음의 첫 변경 직전 상태만 기준점으로 보관한다.
  const burstBaselineRef = useRef<HistoryEntry | null>(null);
  const burstTimerRef = useRef<number | null>(null);
  const editingRef = useRef(true);
  const scrollAnchorRef = useRef<{ id: string; offset: number } | null>(null);
  const overlayOpenRef = useRef(false);
  const saveTailRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const statusRef = useRef(status);
  const helpPanelRef = useRef<HTMLDivElement>(null);
  const publishPanelRef = useRef<HTMLDivElement>(null);
  const popupPanelRef = useRef<HTMLDivElement>(null);
  statusRef.current = status;
  useEffect(() => {
    editingRef.current = editing;
    overlayOpenRef.current = helpOpen || publishOpen || privacyOpen || checkpointOpen || popupOpen || popupFormOpen;
  });
  useEffect(() => {
    if (!publishOpen) return;
    let cancelled = false;
    void fetch(`/api/projects/${projectId}/recipients`)
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as {
          recipients?: Array<{ isActive?: boolean; verificationStatus?: string }>;
        };
        if (cancelled) return;
        const count = (json.recipients ?? []).filter(
          (row) => row.isActive !== false && row.verificationStatus === "VERIFIED",
        ).length;
        setVerifiedRecipientCount(count);
      })
      .catch(() => {
        if (!cancelled) setVerifiedRecipientCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [publishOpen, projectId]);
  // 편집 ↔ 미리보기 전환 뒤에도 보던 섹션 위치를 그대로 유지한다.
  useLayoutEffect(() => {
    const anchor = scrollAnchorRef.current;
    if (!anchor) return;
    scrollAnchorRef.current = null;
    const restore = () => {
      const scroller = document.querySelector("[data-preview-scroll]");
      const node = scroller?.querySelector(`[id="${window.CSS.escape(anchor.id)}"]`);
      if (!(scroller instanceof HTMLElement) || !(node instanceof HTMLElement)) return;
      const delta = node.getBoundingClientRect().top - scroller.getBoundingClientRect().top + anchor.offset;
      scroller.scrollTop += delta;
    };
    restore();
    // 히어로 높이 등 효과 뒤에 정해지는 레이아웃까지 반영한다.
    const frame = window.requestAnimationFrame(() => {
      restore();
      window.requestAnimationFrame(restore);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editing]);
  // 편집을 벗어나 미리보기로 들어오면 공개 화면처럼 600ms 뒤 이벤트 팝업을 자동으로 연다.
  // 원본(midday/info) 스킨은 MiddayLandingView가 자체 타이머로 띄우므로 여기서 강제하지 않는다.
  // oak-editorial은 VisitPopup을 렌더하지 않으므로 자동 오픈을 건너뛴다.
  useEffect(() => {
    if (editing) return;
    const code = dataRef.current?.template.code;
    if (isOriginSkinCode(code) || code === "oak-editorial") return;
    const popup = dataRef.current?.draft.globalSettings.popup as PopupSettingsValue | undefined;
    if (!isPopupEnabled(popup)) return;
    const timer = window.setTimeout(() => {
      if (editingRef.current || overlayOpenRef.current) return;
      setPopupFromSettings(false);
      setPopupOpen(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [editing]);
  const dragSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
  );
  useDialogFocusTrap({
    open: helpOpen,
    panelRef: helpPanelRef,
    onEscape: () => setHelpOpen(false),
  });
  useDialogFocusTrap({
    open: popupFormOpen,
    panelRef: popupPanelRef,
    onEscape: () => setPopupFormOpen(false),
  });
  useDialogFocusTrap({
    open: publishOpen,
    panelRef: publishPanelRef,
    onEscape: () => {
      if (statusRef.current !== "publishing") setPublishOpen(false);
    },
    escapeEnabled: status !== "publishing",
  });
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function resetHistory() {
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    burstTimerRef.current = null;
    burstBaselineRef.current = null;
    pastRef.current = [];
    futureRef.current = [];
  }

  async function adoptLatestDraft(message: string) {
    pendingRef.current = null;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    resetHistory();
    setSelectedId(null);
    await load();
    setError(message);
  }

  useEffect(() => {
    async function onVisible() {
      if (document.visibilityState !== "visible") return;
      const current = dataRef.current;
      if (!current) return;
      const res = await fetch(`/api/projects/${projectId}/draft`);
      const json = await res.json();
      if (!res.ok || json.draft?.revision === current.draft.revision) return;
      // 저장 대기 중인 로컬 수정이 있으면 덮어쓰지 않고 안내만 표시
      if (pendingRef.current) {
        setError(
          shellText(
            current.draft.globalSettings,
            "shellDraftRemoteChanged",
            "다른 화면에서 작업본이 바뀌었습니다. 저장이 끝나면 최신 내용을 다시 불러오세요.",
          ),
        );
        return;
      }
      resetHistory();
      setSelectedId(null);
      setData(json);
      dataRef.current = json;
      setStatus(json.project.hasUnpublishedChanges ? "draft_saved" : "saved");
      setError(shellText(current.draft.globalSettings, "shellDraftReloaded", "다른 화면에서 작업본이 바뀌어 최신 내용을 불러왔습니다."));
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [projectId]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!pendingRef.current && statusRef.current !== "saving" && statusRef.current !== "save_failed") return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/draft`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? shellText(dataRef.current?.draft.globalSettings, "shellDraftLoadFail", "작업본을 불러오지 못했습니다."));
      return;
    }
    setData(json);
    dataRef.current = json;
    setStatus(json.project.hasUnpublishedChanges ? "draft_saved" : "saved");
    setSelectedId((current) => {
      if (current && Array.isArray(json.sections) && json.sections.some((section: PageSection) => section.id === current)) return current;
      return json.sections?.[0]?.id ?? null;
    });
  }

  const loadDraft = useEffectEvent(() => {
    void load();
  });
  const runUndo = useEffectEvent(() => {
    undo();
  });
  const runRedo = useEffectEvent(() => {
    redo();
  });
  const runSwitchMode = useEffectEvent((nextEditing: boolean) => {
    switchMode(nextEditing);
  });

  useEffect(() => {
    loadDraft();
  }, [projectId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT");
      const meta = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (meta && (key === "z" || key === "y")) {
        // 글을 입력하는 중이거나 미리보기에서는 브라우저 기본 실행 취소를 그대로 둔다.
        if (!editingRef.current || typing) return;
        event.preventDefault();
        if (key === "y" || event.shiftKey) runRedo();
        else runUndo();
        return;
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setCheckpointOpen(true);
        return;
      }
      if (!typing && !meta && event.key.toLowerCase() === "p") {
        event.preventDefault();
        runSwitchMode(!editingRef.current);
        return;
      }
      if (!typing && !meta && event.key === "?") {
        event.preventDefault();
        setHelpOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") {
        // 미리보기에서 열린 창이 없을 때의 Esc는 편집으로 돌아간다.
        if (!editingRef.current && !typing && !overlayOpenRef.current) {
          runSwitchMode(true);
          return;
        }
        setHelpOpen(false);
        if (!typing) {
          if (statusRef.current !== "publishing") setPublishOpen(false);
          setCheckpointOpen(false);
          if (!window.matchMedia("(min-width: 1024px)").matches) setListOpen(false);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (status === "pending" || status === "saving" || status === "save_failed") {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const snapshot: PageSnapshot | null = useMemo(() => {
    if (!data) return null;
    const siteName = String(data.draft.globalSettings.siteName ?? data.project.name);
    return {
      templateCode: data.template.code,
      projectName: siteName,
      publicSlug: data.project.publicSlug,
      phone: String(data.draft.globalSettings.phone ?? ""),
      globalSettings: data.draft.globalSettings,
      formSettings: data.draft.formSettings,
      seoSettings: data.draft.seoSettings,
      privacy: data.draft.privacySettings,
      sections: data.sections.map((section) =>
        clampLaunchExcludedSection(section, { templateCode: data.template.code }),
      ),
    };
  }, [data]);

  function capture(current: DraftResponse): HistoryEntry {
    return structuredClone({
      sections: current.sections,
      globalSettings: current.draft.globalSettings,
      formSettings: current.draft.formSettings,
      seoSettings: current.draft.seoSettings,
      privacySettings: current.draft.privacySettings,
    });
  }

  /** 진행 중인 입력 묶음을 실행 취소 기록 한 칸으로 확정한다. */
  function commitBurst() {
    if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    burstTimerRef.current = null;
    const baseline = burstBaselineRef.current;
    burstBaselineRef.current = null;
    if (baseline) pastRef.current = [...pastRef.current, baseline].slice(-40);
  }

  function undo() {
    commitBurst();
    const current = dataRef.current;
    const previous = pastRef.current.pop();
    if (!current || !previous) return;
    futureRef.current.push(capture(current));
    persist(previous.sections, previous, false);
  }

  function redo() {
    commitBurst();
    const current = dataRef.current;
    const next = futureRef.current.pop();
    if (!current || !next) return;
    pastRef.current.push(capture(current));
    persist(next.sections, next, false);
  }

  /** 편집 ↔ 미리보기 전환. 입력 포커스를 풀고, 열린 팝업을 닫는다. 기기 폭 선택은 유지한다. */
  function switchMode(nextEditing: boolean) {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    // 전환 전에 화면 맨 위에 걸린 섹션과 그 안에서의 위치를 기억해 둔다.
    const scroller = document.querySelector("[data-preview-scroll]");
    if (scroller instanceof HTMLElement) {
      const top = scroller.getBoundingClientRect().top;
      const sections = Array.from(
        scroller.querySelectorAll<HTMLElement>(
          ".presale-foreon > section[id], [data-template='oak-editorial'] section[id], [data-template='oak-editorial'] footer[id]",
        ),
      );
      const hit = sections.find((node) => node.getBoundingClientRect().bottom > top + 1);
      scrollAnchorRef.current = hit ? { id: hit.id, offset: top - hit.getBoundingClientRect().top } : null;
    } else {
      scrollAnchorRef.current = null;
    }
    commitBurst();
    setPopupOpen(false);
    setPopupFromSettings(false);
    setEditing(nextEditing);
  }

  async function persist(next: DraftResponse["sections"], extra?: Partial<DraftResponse["draft"]>, recordHistory = true) {
    const current = dataRef.current;
    if (!current) return;
    // 체크포인트·undo로 FAQ/gallery가 다시 보여도 즉시 숨긴다 (oak FAQ 제외).
    const sections = next.map((section) =>
      clampLaunchExcludedSection(section, { templateCode: current.template.code }),
    );
    if (recordHistory) {
      // 400ms 안에 이어지는 변경은 한 번의 실행 취소로 되돌린다. 묶음의 첫 변경 직전 상태만 보관한다.
      if (!burstBaselineRef.current) burstBaselineRef.current = capture(current);
      futureRef.current = [];
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = window.setTimeout(commitBurst, 400);
    }
    const merged: DraftResponse = {
      ...current,
      sections,
      draft: extra ? { ...current.draft, ...extra } : current.draft,
      project: { ...current.project, hasUnpublishedChanges: true },
    };
    const siteName = String(merged.draft.globalSettings.siteName ?? "").trim();
    if (siteName) merged.project = { ...merged.project, name: siteName };
    dataRef.current = merged;
    setData(merged);
    pendingRef.current = { sections, extra };
    // 디바운스 구간은 아직 서버 요청 전이므로 '저장됨'/'저장 중'을 쓰지 않는다.
    setStatus("pending");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      enqueueSave();
    }, 700);
  }

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  });

  function enqueueSave() {
    saveTailRef.current = saveTailRef.current.then(() => flushSave());
    return saveTailRef.current;
  }

  async function flushSave() {
    while (pendingRef.current && dataRef.current) {
      const current = dataRef.current;
      const pending = pendingRef.current;
      pendingRef.current = null;
      setStatus("saving");
      let json: { message?: string; revision?: number; code?: string; details?: { currentRevision?: number } } = {};
      let res: Response;
      try {
        res = await fetch(`/api/projects/${projectId}/draft`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedRevision: current.project.draftRevision,
            sections: pending.sections,
            globalSettings: pending.extra?.globalSettings ?? current.draft.globalSettings,
            formSettings: pending.extra?.formSettings ?? current.draft.formSettings,
            seoSettings: pending.extra?.seoSettings ?? current.draft.seoSettings,
            privacySettings: pending.extra?.privacySettings ?? current.draft.privacySettings,
          }),
        });
        json = await res.json();
      } catch {
        if (!pendingRef.current) pendingRef.current = pending;
        setStatus("save_failed");
        setError(shellText(dataRef.current?.draft.globalSettings, "shellSaveFail", "저장에 실패했습니다."));
        return false;
      }
      if (!res.ok || typeof json.revision !== "number") {
        const conflictMark = shellText(dataRef.current?.draft.globalSettings, "shellDraftConflictMark", "최신 작업본");
        const conflict = json.code === "DRAFT_CONFLICT" || (conflictMark ? (json.message ?? "").includes(conflictMark) : false);
        if (conflict) {
          const remoteRevision =
            json.details && typeof (json.details as { currentRevision?: unknown }).currentRevision === "number"
              ? (json.details as { currentRevision: number }).currentRevision
              : undefined;
          const base = shellText(
            dataRef.current?.draft.globalSettings,
            "shellDraftConflict",
            "다른 화면에서 작업본이 바뀌어, 이 화면에 남아 있던 저장 전 수정은 두고 최신 작업본을 불러왔습니다.",
          );
          await adoptLatestDraft(remoteRevision != null ? `${base} (${remoteRevision})` : base);
          return false;
        }
        if (!pendingRef.current) pendingRef.current = pending;
        setStatus("save_failed");
        setError(json.message ?? shellText(dataRef.current?.draft.globalSettings, "shellSaveFail", "저장에 실패했습니다."));
        return false;
      }
      const revision = json.revision;
      const latest = dataRef.current ?? current;
      const nextData: DraftResponse = {
        ...latest,
        project: { ...latest.project, draftRevision: revision, hasUnpublishedChanges: true },
        draft: { ...latest.draft, revision },
        // 서버 saveDraft clamp와 UI를 맞춘다 (FAQ·gallery 숨김, oak FAQ 제외).
        sections: latest.sections.map((section) =>
          clampLaunchExcludedSection(section, { templateCode: latest.template.code }),
        ),
      };
      dataRef.current = nextData;
      setData(nextData);
      // 서버 PATCH 성공 후에만 저장 성공으로 표시한다. 공개본 반영 여부와 분리한다.
      setStatus(pendingRef.current ? "pending" : "draft_saved");
      setError("");
    }
    if (!pendingRef.current) {
      setToast(shellText(dataRef.current?.draft.globalSettings, "shellSavedToast", "작업본을 저장했습니다"));
    }
    return true;
  }

  async function publish() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const current = dataRef.current;
    if (!current) return;
    const blocking = collectPublishErrors({
      templateCode: current.template.code,
      projectName: String(current.draft.globalSettings.siteName || current.project.name),
      publicSlug: current.project.publicSlug,
      phone: String(current.draft.globalSettings.phone ?? ""),
      globalSettings: current.draft.globalSettings,
      formSettings: current.draft.formSettings,
      seoSettings: current.draft.seoSettings,
      privacy: current.draft.privacySettings,
      sections: current.sections,
    });
    if (blocking.length) {
      setPublishBlockingErrors(blocking);
      setError(blocking.join(" "));
      setStatus("saved");
      // 수집 주체·제3자 설정이 막으면 발행 창을 닫고 설정으로 바로 보낸다.
      if (
        blocking.some(
          (item) =>
            item.includes("개인정보") ||
            item.includes("수집 주체") ||
            item.includes("처리 주체") ||
            item.includes("제3자"),
        )
      ) {
        setPublishOpen(false);
        setPrivacyOpen(true);
      }
      return;
    }
    setPublishBlockingErrors([]);
    const saved = await enqueueSave();
    if (!saved) return;
    setStatus("publishing");
    const summary = changeSummary.trim();
    const res = await fetch(`/api/projects/${projectId}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(summary ? { changeSummary: summary } : {}),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message ?? shellText(dataRef.current?.draft.globalSettings, "shellPublishFail", "발행에 실패했습니다."));
      setPublishBlockingErrors([String(json.message ?? shellText(dataRef.current?.draft.globalSettings, "shellPublishFail", "발행에 실패했습니다."))]);
      setStatus("saved");
      return;
    }
    await load();
    setStatus("published");
    setPublishDone(true);
  }

  function openChecklistTarget(target: string) {
    const current = dataRef.current;
    if (!current) return;
    setPublishOpen(false);
    if (target === "logo") {
      const logo =
        document.querySelector<HTMLElement>(".presale-logo-mark, .oak-editorial-root .logo-media, [data-site-logo]") ||
        document.querySelector<HTMLElement>(".presale-logo, .oak-editorial-root .logo");
      if (logo) {
        const scroller = logo.closest("[data-preview-scroll]");
        if (scroller instanceof HTMLElement) {
          scroller.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          logo.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }
      scrollToSection("hero");
      return;
    }
    if (target === "privacy") {
      setPrivacyOpen(true);
      return;
    }
    if (target === "site" && isOriginSkinCode(current.template.code)) {
      scrollToSection(PRESALE_SECTION_DOM_IDS.site);
      return;
    }
    const section = current.sections.find((item) => item.sectionType === target);
    if (!section) return;
    setSelectedId(section.id);
    scrollToSection(section.anchorId);
  }

  function onDragEnd(event: DragEndEvent) {
    if (!data || !event.over) return;
    const oldIndex = data.sections.findIndex((section) => section.id === event.active.id);
    const newIndex = data.sections.findIndex((section) => section.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = pinSectionOrder(arrayMove(data.sections, oldIndex, newIndex));
    persist(next);
  }

  function onMoveSection(sectionId: string, direction: -1 | 1) {
    const next = sectionsAfterMove(dataRef.current?.sections ?? [], sectionId, direction);
    if (next) persist(next);
  }

  const edit = useMemo<CanvasEdit | null>(() => {
    if (!editing || !data) return null;
    const save = (...args: Parameters<typeof persist>) => persistRef.current(...args);
    return {
      patch: (sectionId, content) => {
        const current = dataRef.current;
        if (!current) return;
        const previous = current.sections.find((section) => section.id === sectionId);
        const sections = current.sections.map((section) => (section.id === sectionId ? { ...section, content } : section));
        if (previous?.sectionType === "floorplan") {
          const names = unitTypeNames((content.types as Array<{ name?: string }>) ?? []);
          save(sections, {
            formSettings: { ...current.draft.formSettings, fields: withUnitTypeOptions(current.draft.formSettings.fields, names) },
          });
          return;
        }
        save(sections);
      },
      setPhone: (phone) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { globalSettings: { ...current.draft.globalSettings, phone: formatPhoneInput(phone) } });
      },
      setSiteName: (name) => {
        const current = dataRef.current;
        if (!current) return;
        const previous = String(current.draft.globalSettings.siteName ?? current.project.name ?? "");
        const sections = withLinkedSiteName(current.sections, previous, name);
        save(sections, { globalSettings: { ...current.draft.globalSettings, siteName: name } });
      },
      setNavSubtitle: (navSubtitle) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { globalSettings: { ...current.draft.globalSettings, navSubtitle } });
      },
      setLogo: (logoUrl) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { globalSettings: { ...current.draft.globalSettings, logoUrl } });
      },
      setIntro: (intro) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { formSettings: { ...current.draft.formSettings, intro } });
      },
      setSuccessMessage: (successMessage) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { formSettings: { ...current.draft.formSettings, successMessage } });
      },
      setSuccessTitle: (successTitle) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { formSettings: { ...current.draft.formSettings, successTitle } });
      },
      setAgainLabel: (againLabel) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { formSettings: { ...current.draft.formSettings, againLabel } });
      },
      setSubmittingLabel: (submittingLabel) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { formSettings: { ...current.draft.formSettings, submittingLabel } });
      },
      setPreviewNote: (previewNote) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { formSettings: { ...current.draft.formSettings, previewNote } });
      },
      setPrivacy: (privacySettings) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { privacySettings });
      },
      setShareLabel: (shareLabel) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { globalSettings: { ...current.draft.globalSettings, shareLabel } });
      },
      setPageCopy: (patch) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { globalSettings: { ...current.draft.globalSettings, ...patch } });
      },
      setFields: (fields) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { formSettings: { ...current.draft.formSettings, fields } });
      },
      setPopup: (popup) => {
        const current = dataRef.current;
        if (!current) return;
        save(current.sections, { globalSettings: { ...current.draft.globalSettings, popup } });
      },
      upload: async (file) => {
        setError("");
        try {
          return await uploadProjectFile(projectId, file);
        } catch (caught) {
          const message = caught instanceof Error && caught.message.trim() ? caught.message : shellText(dataRef.current?.draft.globalSettings, "shellUploadFail", "업로드에 실패했습니다.");
          const blocked = caught instanceof UploadError && (caught.status === 503 || message.includes("로컬 파일 저장"));
          setError(blocked ? `${message} ${orgText("storageUrlHint")}` : message);
          throw caught;
        }
      },
    };
  }, [editing, data, projectId]);

  if (!data || !snapshot) {
    return <p className="p-8 text-sm text-text-muted">{error || shellText(undefined, "shellDraftLoading", "작업본을 불러오는 중입니다.")}</p>;
  }

  const width = viewport === "mobile" ? "max-w-[390px]" : viewport === "tablet" ? "max-w-[768px]" : "max-w-none";
  const labels = data.draft.globalSettings;
  const isOriginSkin = isOriginSkinCode(data.template.code);
  const middayData = readMiddayPresaleDataForSnapshot(snapshot);
  const originSectionKeys = (middayData.sectionOrder?.length
    ? middayData.sectionOrder
    : (Object.keys(PRESALE_SECTION_LABELS) as PresaleSectionKey[])
  ).filter(
    (key) =>
      key !== "whyZigbang" &&
      key !== "faq" &&
      (key !== "consultant" || middayData.visibleSections.consultant),
  );

  /** 팝업 미리보기를 닫는다. 설정 화면에서 열었다면 설정 창을 다시 연다. */
  function closePopupPreview() {
    setPopupOpen(false);
    if (popupFromSettings) {
      setPopupFromSettings(false);
      setPopupFormOpen(true);
    }
  }
  const hasUnsavedWork = () => Boolean(pendingRef.current) || status === "pending" || status === "saving" || status === "save_failed";
  const toolClass = "inline-flex h-[34px] items-center gap-1.5 rounded-[10px] px-3 text-xs font-bold text-white/85 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";
  const popupSettings = (data.draft.globalSettings.popup ?? {}) as PopupSettingsValue;
  const originPopupSettings: PopupSettingsValue = {
    enabled: Boolean(middayData.popup?.enabled),
    title: middayData.popup?.title,
    body: middayData.popup?.description,
    imageUrl: middayData.popup?.imageUrl,
    ctaLabel: middayData.popup?.ctaLabel,
    perks: middayData.popup?.perks,
    disclaimer: middayData.popup?.disclaimer,
    phone: middayData.popup?.phone,
  };
  const popupFormValue = isOriginSkin ? originPopupSettings : popupSettings;
  const popupEnabled = isOriginSkin
    ? Boolean(middayData.popup?.enabled)
    : isPopupEnabled(popupSettings);
  // 직방과 동일: 기기 프레임은 미리보기에서만. 편집 중에는 항상 풀폭 캔버스.
  const deviceFrame = !editing && (viewport === "tablet" || viewport === "mobile");

  return (
    <div className="flex h-screen flex-col bg-surface">
      <header
        className="relative z-[60] grid h-[60px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-white/10 px-5 text-white [background:linear-gradient(180deg,rgba(255,255,255,0.06)_0%,transparent_42%),linear-gradient(135deg,#0c1017_0%,#191f28_48%,#121820_100%)]"
        aria-label="랜딩페이지 편집기"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <Link
            href="/admin/projects/new"
            className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] pl-2.5 pr-3.5 text-xs font-bold text-white/90 hover:bg-white/10"
            onClick={(event) => {
              // 편집 내용은 자동 저장된다. 저장이 끝나지 않았거나 실패한 변경이 있을 때만 묻는다.
              if (!hasUnsavedWork()) return;
              const ok = window.confirm(
                shellText(
                  labels,
                  "shellExitConfirm",
                  "아직 저장되지 않은 변경이 있습니다.\n\n지금 나가면 마지막 자동 저장 이후 내용은 사라질 수 있습니다. 템플릿 선택 화면으로 이동할까요?",
                ),
              );
              if (!ok) event.preventDefault();
            }}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <path d="M15 6 9 12l6 6" />
              </svg>
            </span>
            {shellText(labels, "shellExitTemplates", "랜딩페이지 설정")}
          </Link>
          <span className="h-7 w-px shrink-0 bg-gradient-to-b from-transparent via-white/20 to-transparent" aria-hidden />
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 text-[10px] font-extrabold tracking-[0.18em] text-primary">ADONEBRIDGE</span>
            <span className="shrink-0 text-[15px] font-extrabold tracking-tight">
              {editing ? shellText(labels, "shellEditing", "랜딩페이지 제작") : shellText(labels, "shellPreviewTitle", "미리보기")}
            </span>
            <span className="truncate text-[11px] font-medium text-white/50" role="status" aria-live="polite">
              {showStatus(status)}
            </span>
          </div>
        </div>
        {!editing ? (
          <nav className="inline-flex items-center gap-0.5 rounded-[14px] border border-white/10 bg-white/5 p-1" aria-label="화면 크기">
            {([
              ["desktop", shellText(labels, "shellDesktop", "PC")],
              ["tablet", shellText(labels, "shellTablet", "태블릿")],
              ["mobile", shellText(labels, "shellMobile", "모바일")],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={viewport === id}
                className={`inline-flex h-[34px] items-center gap-1.5 rounded-[10px] px-2.5 text-[11px] font-bold ${viewport === id ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                onClick={() => setViewport(id)}
              >
                <ViewportIcon id={id} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        ) : (
          <span className="justify-self-center" aria-hidden />
        )}
        <div className="flex items-center justify-end gap-2.5">
          {!editing && data.template.code !== "oak-editorial" ? (
            <button
              type="button"
              className={`${toolClass} ${!popupEnabled ? "opacity-45" : ""}`}
              disabled={!popupEnabled}
              title={
                !popupEnabled
                  ? shellText(labels, "shellPopupDisabledHint", "편집 계속에서 이벤트 팝업을 켜면 미리볼 수 있습니다")
                  : shellText(labels, "shellPopupPreviewTitle", "이벤트 팝업 미리보기")
              }
              onClick={() => {
                setPopupFromSettings(false);
                setPopupOpen(true);
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
              </svg>
              <span>{shellText(labels, "shellPopup", "이벤트 팝업")}</span>
            </button>
          ) : null}
          <nav className="inline-flex items-center gap-0.5 rounded-[14px] border border-white/10 bg-white/5 p-1" aria-label="편집 도구">
            {editing ? (
              <>
                <Link
                  href="/admin/projects/new"
                  className={toolClass}
                  title={shellText(labels, "shellCreateNewTitle", "초기 템플릿으로 새 랜딩 시작")}
                  onClick={(event) => {
                    // 자동 저장이 있으므로 저장이 끝나지 않은 변경이 있을 때만 묻는다.
                    if (!hasUnsavedWork()) return;
                    const ok = window.confirm(
                      shellText(
                        labels,
                        "shellCreateNewConfirm",
                        "아직 저장되지 않은 변경이 있습니다.\n\n지금 새로 시작하면 마지막 자동 저장 이후 내용은 사라질 수 있습니다. 초기 템플릿으로 새 랜딩을 시작할까요?",
                      ),
                    );
                    if (!ok) event.preventDefault();
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M12 18v-6M9 15h6" />
                  </svg>
                  <span>{shellText(labels, "shellCreateNew", "새로 만들기")}</span>
                </Link>
                <button type="button" className={toolClass} title={shellText(labels, "shellCheckpointTitle", "이름을 붙여 체크포인트를 저장·복원")} onClick={() => setCheckpointOpen(true)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <path d="M17 21v-8H7v8M7 3v5h8" />
                  </svg>
                  <span>{shellText(labels, "shellCheckpoint", "임시 저장")}</span>
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={toolClass}
              onClick={() => switchMode(!editing)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>{editing ? shellText(labels, "shellPreview", "미리보기") : shellText(labels, "shellKeepEditing", "편집 계속")}</span>
            </button>
          </nav>
          <button
            type="button"
            data-testid="publish-button"
            className="inline-flex h-[38px] items-center rounded-[14px] bg-primary px-4 text-[13px] font-extrabold text-white hover:bg-primary-hover"
            onClick={() => {
              setPublishDone(false);
              setPublishBlockingErrors([]);
              setVerifiedRecipientCount(null);
              setPublishOpen(true);
            }}
          >
            {data.project.status === "PUBLISHED" ? shellText(labels, "shellRepublish", "재발행") : shellText(labels, "shellPublish", "발행하기")}
          </button>
        </div>
      </header>
      {error ? (
        <p className="bg-[#fdeeee] px-4 py-2 text-sm text-danger" role="alert" aria-live="assertive">
          <span>{error}</span>
          {status === "save_failed" ? (
            <button type="button" className="ml-3 font-semibold underline" onClick={() => void flushSave()}>
              {shellText(labels, "shellRetrySave", "다시 저장")}
            </button>
          ) : null}
        </p>
      ) : null}
      {toast ? (
        <p
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[14px] bg-text-primary px-4 py-3 text-sm font-semibold text-white"
        >
          {toast}
        </p>
      ) : null}
      {editing ? <EditModeBanner settings={labels} /> : <PreviewModeBanner hiddenCount={data.sections.filter((section) => !section.isVisible).length} settings={labels} />}
      {editing && listOpen ? (
        <button type="button" className="fixed inset-0 top-[60px] z-20 bg-text-primary/40 lg:hidden" aria-label={shellText(labels, "shellListClose", "섹션 목록 닫기")} onClick={() => setListOpen(false)} />
      ) : null}
      {editing ? (
        <button
          type="button"
          className="fixed bottom-5 left-4 z-40 inline-flex h-11 items-center justify-center rounded-full bg-text-primary px-4 text-[13px] font-extrabold text-white lg:hidden"
          aria-label={shellText(labels, "shellListOpen", "섹션 목록 펼치기")}
          onClick={() => setListOpen(true)}
        >
          {shellText(labels, "shellSections", "섹션")}
        </button>
      ) : null}
      <div
        className={`grid min-h-0 flex-1 ${
          editing
            ? listOpen
              ? "lg:grid-cols-[280px_minmax(0,1fr)]"
              : "lg:grid-cols-[44px_minmax(0,1fr)]"
            : "grid-cols-1"
        }`}
      >
        {editing ? (
        <aside className={`${listOpen ? "fixed bottom-0 left-0 top-[60px] z-30 flex w-[min(100%,280px)] lg:static lg:z-auto lg:w-auto" : "hidden lg:flex"} min-h-0 flex-col border-r border-border bg-surface`}>
          <div className="flex h-12 shrink-0 items-center justify-end border-b border-border px-3">
            <button
              type="button"
              className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[14px] text-text-muted hover:bg-white hover:text-text-body"
              aria-label={listOpen ? shellText(labels, "shellListClose", "섹션 목록 닫기") : shellText(labels, "shellListOpen", "섹션 목록 펼치기")}
              onClick={() => setListOpen((open) => !open)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                {listOpen ? <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" /> : <path d="m13 17 5-5-5-5M6 17l5-5-5-5" />}
              </svg>
            </button>
          </div>
          {listOpen ? (
          <>
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3.5">
          <ConfirmDialog
            open={cloneDeleteConfirmOpen}
            title={shellText(labels, "shellDeleteClone", "복제본 삭제")}
            description={shellText(
              labels,
              "shellDeleteCloneAsk",
              "이 복제본을 삭제할까요? 숨기기와 달리 복제본 자체는 목록에서 제거됩니다. 원본은 그대로입니다.",
            )}
            confirmLabel={shellText(labels, "shellDeleteCloneConfirm", "복제본 삭제")}
            danger
            onCancel={() => setCloneDeleteConfirmOpen(false)}
            onConfirm={() => {
              setCloneDeleteConfirmOpen(false);
              const selected = data.sections.find((section) => section.id === selectedId);
              if (!selected || selected.isOriginal || selected.isRequired) return;
              try {
                const next = removeCloneSection(data.sections, selected.id);
                const fallback = next.find((section) => section.rootSectionId === selected.rootSectionId)?.id ?? next[0]?.id ?? "";
                setSelectedId(fallback);
                persist(next);
                setError("");
              } catch (caught) {
                setError(
                  caught instanceof ApiError
                    ? caught.message
                    : shellText(labels, "shellDeleteCloneFail", "복제본을 삭제하지 못했습니다."),
                );
              }
            }}
          />
          <div className="rounded-[16px] border border-border bg-white p-3">
          <h2 className="text-[13px] font-semibold">{shellText(labels, "shellSections", "섹션")}</h2>
          <p className="mt-1 text-[11px] leading-snug text-text-muted">
            {isOriginSkin
              ? shellText(labels, "shellOriginSectionHint", "섹션을 누르면 해당 영역으로 이동합니다")
              : shellText(labels, "shellSectionHint", "드래그하여 순서 변경 · 클릭 시 해당 영역으로 이동")}
          </p>
          {isOriginSkin ? (
            <div className="mt-2.5 flex flex-col gap-0.5">
              {originSectionKeys.map((key) => {
                const anchorId = PRESALE_SECTION_DOM_IDS[key];
                const visible = Boolean(middayData.visibleSections[key]);
                const selected = selectedId === key || viewedAnchor === anchorId;
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 rounded-[12px] px-2 py-2 ${selected ? "bg-primary-soft" : "hover:bg-surface"}`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-text-primary"
                      onClick={() => {
                        setSelectedId(key);
                        scrollToSection(anchorId);
                        if (!window.matchMedia("(min-width: 1024px)").matches) setListOpen(false);
                      }}
                    >
                      {PRESALE_SECTION_LABELS[key]}
                    </button>
                    <SectionSwitch
                      checked={visible}
                      label={PRESALE_SECTION_LABELS[key]}
                      onClick={() => {
                        const next: PresaleLandingData = {
                          ...middayData,
                          visibleSections: {
                            ...middayData.visibleSections,
                            [key]: !visible,
                          },
                        };
                        persistMiddayData(persist, data.sections, data.draft.globalSettings, next);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
          <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={sidebarSections(data.sections).map((section) => section.id)} strategy={verticalListSortingStrategy}>
              <div className="mt-2.5 flex flex-col gap-0.5">
                {sidebarSections(data.sections).map((section) => (
                  <SortableRow
                    key={section.id}
                    section={section}
                    settings={labels}
                    templateCode={data.template.code}
                    selected={section.id === selectedId}
                    viewed={section.anchorId === viewedAnchor}
                    canMoveUp={sectionsAfterMove(data.sections, section.id, -1) !== null}
                    canMoveDown={sectionsAfterMove(data.sections, section.id, 1) !== null}
                    onMove={onMoveSection}
                    onSelect={() => {
                      setSelectedId(section.id);
                      scrollToSection(section.anchorId);
                      if (!window.matchMedia("(min-width: 1024px)").matches) {
                        setListOpen(false);
                      }
                    }}
                    onToggle={() => {
                      persist(
                        data.sections.map((item) => {
                          if (item.id !== section.id) return item;
                          const nextVisible = !item.isVisible;
                          if (nextVisible && isLaunchExcludedSection(item, data.template.code)) return item;
                          return { ...item, isVisible: nextVisible };
                        }),
                      );
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          )}
          </div>
          {data.template.code !== "oak-editorial" ? (
          <div className="rounded-[16px] border border-border bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <button type="button" className="min-w-0 flex-1 rounded-[14px] px-1 py-0.5 text-left hover:bg-primary-soft" onClick={() => setPopupFormOpen(true)}>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                  </svg>
                  {shellText(labels, "shellPopup", "이벤트 팝업")}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-text-muted">{shellText(labels, "shellPopupIntro", "방문 시 자동 노출되는 프로모션")}</span>
                <span className="mt-1.5 block text-[11px] font-semibold text-primary">{shellText(labels, "shellPopupClickHint", "클릭하여 설정")}</span>
              </button>
              <SectionSwitch
                checked={popupEnabled}
                label={shellText(labels, "shellPopup", "이벤트 팝업")}
                onClick={() => {
                  if (isOriginSkin) {
                    const next: PresaleLandingData = {
                      ...middayData,
                      popup: { ...middayData.popup, enabled: !popupEnabled },
                    };
                    persistMiddayData(persist, data.sections, data.draft.globalSettings, next);
                    return;
                  }
                  persist(data.sections, { globalSettings: { ...data.draft.globalSettings, popup: { ...popupSettings, enabled: !popupEnabled } } });
                }}
              />
            </div>
          </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs font-medium text-text-muted">
            {isOriginSkin ? null : (() => {
              const selected = data.sections.find((section) => section.id === selectedId);
              if (!selected || selected.isRequired) return null;
                  const copies = countCopiesForRoot(data.sections, selected.rootSectionId);
              const allow = canDuplicate(data.sections, selected.rootSectionId, {
                allowOakFaq: data.template.code === "oak-editorial",
              });
              return (
                <>
                  <span className="text-text-muted" title={shellText(labels, "shellCopyQuotaHint", "원본당 복제본 최대 개수")}>
                    {shellText(labels, "shellCopyQuota", "복제 {n}/{max}")
                      .replace("{n}", String(copies))
                      .replace("{max}", String(MAX_SECTION_COPIES_PER_ORIGINAL))}
                  </span>
                  {allow ? (
                    <button
                      type="button"
                      className="hover:text-text-primary"
                      onClick={() => {
                        try {
                          persist(duplicateSection({ sections: data.sections, selectedSectionId: selected.id, projectId }));
                          setError("");
                        } catch (caught) {
                          setError(
                            caught instanceof ApiError
                              ? caught.message
                              : shellText(labels, "shellDuplicateFail", "복제하지 못했습니다."),
                          );
                        }
                      }}
                    >
                      {shellText(labels, "shellDuplicate", "복제")}
                    </button>
                  ) : null}
                </>
              );
            })()}
            {isOriginSkin ? null : (() => {
              const selected = data.sections.find((section) => section.id === selectedId);
              // 숨기기: 내용 보존·다시 표시. 복제본 삭제: 복제본만 목록에서 제거(원본·필수 불가).
              if (!selected || selected.isRequired) return null;
              const excluded = isLaunchExcludedSection(selected, data.template.code);
              return (
                <>
                  {selected.isVisible === false ? (
                    excluded ? null : (
                      <button
                        type="button"
                        className="hover:text-text-primary"
                        onClick={() =>
                          persist(
                            data.sections.map((section) =>
                              section.id === selected.id ? { ...section, isVisible: true } : section,
                            ),
                          )
                        }
                      >
                        {shellText(labels, "shellShowAgain", "다시 표시")}
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      className="hover:text-text-primary"
                      title={shellText(labels, "shellHideHint", "페이지에서 가립니다. 내용은 남고 다시 표시할 수 있습니다.")}
                      onClick={() =>
                        persist(
                          data.sections.map((section) =>
                            section.id === selected.id ? { ...section, isVisible: false } : section,
                          ),
                        )
                      }
                    >
                      {shellText(labels, "shellHide", "숨기기")}
                    </button>
                  )}
                  {!selected.isOriginal ? (
                    <button type="button" className="text-danger hover:text-danger" onClick={() => setCloneDeleteConfirmOpen(true)}>
                      {shellText(labels, "shellDeleteClone", "복제본 삭제")}
                    </button>
                  ) : null}
                </>
              );
            })()}
          </div>
          <div className="mt-3 px-1">
            <button
              type="button"
              className="inline-flex h-10 w-full items-center justify-center rounded-[14px] border border-border bg-white text-[13px] font-semibold text-text-primary hover:bg-surface"
              onClick={() => setPrivacyOpen(true)}
              data-testid="privacy-settings-button"
            >
              {shellText(labels, "shellPrivacySettings", "개인정보·발행 설정")}
            </button>
          </div>
          <details className="mt-2 px-1 text-xs font-medium text-text-muted">
            <summary className="cursor-pointer">{shellText(labels, "shellMore", "더보기")}</summary>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <button type="button" className="hover:text-text-primary" onClick={() => setHelpOpen(true)}>
                {shellText(labels, "shellShortcuts", "단축키")}
              </button>
              <Link href={`/admin/projects/${projectId}`} className="hover:text-text-primary">
                {shellText(labels, "shellProject", "현장")}
              </Link>
              <Link href={`/admin/projects/${projectId}/versions`} className="hover:text-text-primary">
                {shellText(labels, "shellVersions", "버전 기록")}
              </Link>
              {status === "save_failed" ? (
                <button type="button" className="font-semibold text-danger" onClick={() => void flushSave()}>
                  {shellText(labels, "shellRetrySave", "다시 저장")}
                </button>
              ) : null}
              {data.project.publishedAt ? (
                <>
                  <a href={`/${snapshot.publicSlug}`} target="_blank" rel="noreferrer" className="hover:text-text-primary">
                    {shellText(labels, "shellLive", "발행 페이지")}
                  </a>
                  <CopyPublicLink compact slug={snapshot.publicSlug} settings={labels} />
                </>
              ) : null}
            </div>
          </details>
          </div>
          </>
          ) : null}
        </aside>
        ) : null}
        <div
          data-preview-scroll
          className={
            deviceFrame
              ? // 직방과 동일: 회색 바깥이 스크롤(스크롤바 유지). flex+justify-center는 스크롤을 깨뜨리므로 쓰지 않는다.
                "min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#e5e7eb] px-3 pb-10 pt-3 sm:px-4"
              : editing
                ? "relative mx-auto h-full min-h-0 w-full flex-1 overflow-auto bg-[#e8eaef]"
                : "relative mx-auto h-full min-h-0 w-full flex-1 overflow-auto bg-white"
          }
        >
          <div
            className={
              !deviceFrame
                ? editing
                  ? "mx-auto min-h-full w-full max-w-none bg-white"
                  : "min-h-full w-full bg-white"
                : viewport === "mobile"
                  ? `mx-auto w-full ${width} overflow-clip rounded-[20px] bg-white shadow-[0_0_0_10px_#1f2937,0_0_0_11px_rgba(15,23,42,0.15),0_28px_56px_rgba(15,23,42,0.2)]`
                  : `mx-auto w-full ${width} overflow-clip rounded-[12px] border border-black/5 bg-white shadow-[0_24px_48px_rgba(15,23,42,0.12)]`
            }
            data-device-frame={deviceFrame ? "" : undefined}
            data-device-viewport={deviceFrame ? viewport : undefined}
          >
            {deviceFrame ? <DeviceFrameMetrics /> : null}
            <LandingPage
              key={data.template.code}
              snapshot={snapshot}
              mode="preview"
              variant={editing ? "desktop" : viewport === "split" ? "desktop" : viewport}
              highlightId={editing ? selectedId : null}
              edit={edit}
              showPopup={popupOpen}
              onClosePopup={closePopupPreview}
              onReturnToSettings={popupFromSettings ? closePopupPreview : undefined}
              onActiveAnchor={setViewedAnchor}
              onSelectSection={(sectionId) => {
                setSelectedId(sectionId);
              }}
              middayProjectId={projectId}
              onMiddayDataChange={(middayData) => {
                const current = dataRef.current;
                if (!current) return;
                const interestLabels = resolveInterestTypeFormOptions(middayData).map((item) => item.label);
                const privacyContact = String(middayData.register?.privacyContactName ?? "").trim();
                persist(current.sections, {
                  globalSettings: {
                    ...current.draft.globalSettings,
                    middayPresaleData: middayData,
                    siteName: middayData.gnb?.siteName || current.draft.globalSettings.siteName,
                    phone: middayData.gnb?.phone || current.draft.globalSettings.phone,
                    logoUrl: middayData.gnb?.logoUrl || current.draft.globalSettings.logoUrl,
                  },
                  formSettings: {
                    ...current.draft.formSettings,
                    fields: withUnitTypeOptions(current.draft.formSettings.fields, interestLabels),
                  },
                  ...(privacyContact
                    ? {
                        privacySettings: {
                          ...current.draft.privacySettings,
                          collectingControllerName: privacyContact,
                        },
                      }
                    : {}),
                });
              }}
              onOakDataChange={(oakData) => {
                const current = dataRef.current;
                if (!current) return;
                const nextSections = syncOakSectionsFromData(current.sections, oakData);
                const planNames = oakData.floorplan.plans
                  .map((plan) => String(plan.name ?? "").trim())
                  .filter(Boolean);
                persist(nextSections, {
                  globalSettings: {
                    ...current.draft.globalSettings,
                    [OAK_DATA_KEY]: oakData,
                    siteName: oakData.brandName || current.draft.globalSettings.siteName,
                    logoUrl: oakData.logoUrl || current.draft.globalSettings.logoUrl,
                  },
                  formSettings: {
                    ...current.draft.formSettings,
                    fields: withUnitTypeOptions(current.draft.formSettings.fields, planNames),
                  },
                });
              }}
              onOakSectionsChange={(nextSections) => {
                const current = dataRef.current;
                if (!current) return;
                persist(nextSections);
              }}
            />
          </div>
        </div>
      </div>
      {popupFormOpen ? (
        <DialogShell titleId="popup-settings-title" panelRef={popupPanelRef} onClose={() => setPopupFormOpen(false)} closeLabel={shellText(labels, "shellClose", "닫기")} size="lg">
          <DialogHeader titleId="popup-settings-title" title={shellText(labels, "shellPopup", "이벤트 팝업")} onClose={() => setPopupFormOpen(false)} closeLabel={shellText(labels, "shellClose", "닫기")} />
          <DialogBody>
            <PopupSettings
              popup={popupFormValue}
              settings={labels}
              showToggle={false}
              onChange={(popup) => {
                if (isOriginSkin) {
                  const next: PresaleLandingData = {
                    ...middayData,
                    popup: {
                      ...middayData.popup,
                      enabled: popup.enabled ?? middayData.popup.enabled,
                      title: popup.title ?? middayData.popup.title,
                      description: popup.body ?? middayData.popup.description,
                      imageUrl: popup.imageUrl ?? middayData.popup.imageUrl,
                      ctaLabel: popup.ctaLabel ?? middayData.popup.ctaLabel,
                      perks: popup.perks ?? middayData.popup.perks,
                      disclaimer: popup.disclaimer ?? middayData.popup.disclaimer,
                      phone: popup.phone ?? middayData.popup.phone,
                    },
                  };
                  persistMiddayData(persist, data.sections, data.draft.globalSettings, next);
                  return;
                }
                persist(data.sections, { globalSettings: { ...data.draft.globalSettings, popup } });
              }}
              onUpload={(file) => uploadProjectFile(projectId, file)}
              onPreview={() => {
                setPopupFormOpen(false);
                setPopupFromSettings(true);
                setPopupOpen(true);
              }}
            />
          </DialogBody>
        </DialogShell>
      ) : null}
      {privacyOpen && data ? (
        <PrivacySettingsDialog
          privacy={data.draft.privacySettings}
          settings={labels}
          onChange={(privacySettings) => {
            const current = dataRef.current;
            if (!current) return;
            if (isOriginSkinCode(current.template.code)) {
              const midday = readMiddayPresaleDataForSnapshot({
                ...snapshot,
                globalSettings: current.draft.globalSettings,
              });
              persist(current.sections, {
                privacySettings,
                globalSettings: {
                  ...current.draft.globalSettings,
                  middayPresaleData: {
                    ...midday,
                    register: {
                      ...midday.register,
                      privacyContactName: privacySettings.collectingControllerName,
                    },
                  },
                },
              });
              return;
            }
            persist(current.sections, { privacySettings });
          }}
          onClose={() => setPrivacyOpen(false)}
        />
      ) : null}
      {helpOpen ? (
        <DialogShell titleId="shortcut-title" panelRef={helpPanelRef} onClose={() => setHelpOpen(false)} closeLabel={shellText(labels, "shellClose", "닫기")} size="sm">
          <DialogHeader titleId="shortcut-title" title={shellText(labels, "shellShortcuts", "단축키")} onClose={() => setHelpOpen(false)} closeLabel={shellText(labels, "shellClose", "닫기")} />
          <DialogBody>
            <ul className="space-y-2 text-sm text-text-body">
              <li>{shellText(labels, "shellKeyUndo", "Ctrl+Z 실행 취소")}</li>
              <li>{shellText(labels, "shellKeyRedo", "Ctrl+Shift+Z 또는 Ctrl+Y 다시 실행")}</li>
              <li>{shellText(labels, "shellKeySave", "Ctrl+S 임시 저장")}</li>
              <li>{shellText(labels, "shellKeyToggle", "P 편집과 미리보기 전환")}</li>
              <li>{shellText(labels, "shellKeyHelp", "? 이 안내")}</li>
              <li>{shellText(labels, "shellKeyEsc", "Esc 열린 창과 좁은 화면의 섹션 목록을 닫기")}</li>
            </ul>
            <p className="mt-3 text-xs text-text-muted">{shellText(labels, "shellKeyNote", "글을 입력하는 중에는 P와 ?가 동작하지 않습니다. Ctrl+S는 입력 중에도 임시 저장을 엽니다.")}</p>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setHelpOpen(false)}>{shellText(labels, "shellClose", "닫기")}</Button>
          </DialogFooter>
        </DialogShell>
      ) : null}
      {checkpointOpen && data ? (
        <CheckpointDialog
          projectId={projectId}
          sections={data.sections}
          globalSettings={data.draft.globalSettings}
          formSettings={data.draft.formSettings}
          seoSettings={data.draft.seoSettings}
          privacySettings={data.draft.privacySettings}
          onClose={() => setCheckpointOpen(false)}
          onRestore={(checkpoint) => {
            setSelectedId(null);
            persist(checkpoint.sections, {
              globalSettings: checkpoint.globalSettings,
              formSettings: checkpoint.formSettings,
              seoSettings: checkpoint.seoSettings,
              privacySettings: checkpoint.privacySettings,
            });
            setCheckpointOpen(false);
          }}
        />
      ) : null}
      {publishOpen ? (
        <DialogShell
          titleId="publish-dialog-title"
          panelRef={publishPanelRef}
          onClose={() => {
            if (status === "publishing") return;
            setPublishOpen(false);
          }}
          closeLabel={shellText(labels, "shellClose", "닫기")}
          closeDisabled={status === "publishing"}
          size="md"
        >
          <DialogHeader
            titleId="publish-dialog-title"
            title={publishDone ? shellText(labels, "shellPublishedTitle", "발행했습니다") : data.project.status === "PUBLISHED" ? shellText(labels, "shellRepublishTitle", "다시 발행") : shellText(labels, "shellPublishTitle", "발행")}
            onClose={() => {
              if (status === "publishing") return;
              setPublishOpen(false);
            }}
            closeLabel={shellText(labels, "shellClose", "닫기")}
            closeDisabled={status === "publishing"}
          />
          <DialogBody>
            {publishDone ? (
              <>
                <p className="text-sm leading-relaxed text-text-body">{shellText(labels, "shellPublishedBody", "공개 주소에서 발행된 페이지를 볼 수 있습니다. 이후 수정은 다시 발행해야 공개 페이지에 반영됩니다.")}</p>
                <div className="mt-5 grid gap-2">
                  <a href={`/${snapshot.publicSlug}`} target="_blank" rel="noreferrer" className="inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-primary px-4 text-[17px] font-semibold text-white hover:bg-primary-hover">
                    {shellText(labels, "shellLive", "발행 페이지")}
                  </a>
                  <Link href={`/admin/projects/${projectId}/versions`} className="inline-flex h-12 w-full items-center justify-center rounded-[14px] border border-border bg-white px-4 text-[17px] font-semibold text-text-primary hover:bg-surface">
                    {shellText(labels, "shellVersions", "버전 기록")}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-text-body">{shellText(labels, "shellPublishBody", "없는 항목이 있어도 발행할 수 있습니다. 항목을 누르면 그 칸으로 이동합니다. 개인정보 처리 주체가 확정되지 않으면 발행이 거절될 수 있습니다.")}</p>
                {publishBlockingErrors.length > 0 ? (
                  <ul className="mt-4 space-y-2 rounded-[14px] border border-border bg-[#fdeeee] p-3 text-sm text-danger" role="alert">
                    {publishBlockingErrors.map((item) => {
                      const privacyIssue =
                        item.includes("개인정보") ||
                        item.includes("수집 주체") ||
                        item.includes("처리 주체") ||
                        item.includes("제3자");
                      return (
                        <li key={item}>
                          {privacyIssue ? (
                            <button
                              type="button"
                              className="text-left font-semibold underline underline-offset-2"
                              onClick={() => {
                                setPublishOpen(false);
                                setPrivacyOpen(true);
                              }}
                            >
                              {item}
                            </button>
                          ) : (
                            item
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {(() => {
                  const notes = publishNotes(snapshot, verifiedRecipientCount);
                  if (notes.length === 0) return null;
                  return (
                    <ul className="mt-4 space-y-2 rounded-[14px] border border-border bg-surface p-3 text-sm text-text-body">
                      {notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  );
                })()}
                <div className="mt-4">
                  <PublishChecklist snapshot={snapshot} onOpen={openChecklistTarget} />
                </div>
                <label className="mt-4 block text-sm font-medium">
                  {shellText(labels, "shellPublishNote", "이번 발행 메모")}
                  <textarea
                    className="ui-field mt-2 min-h-16 py-2.5 text-sm"
                    maxLength={200}
                    value={changeSummary}
                    placeholder={shellText(labels, "shellPublishMemoPlaceholder", "비우면 최초 발행 또는 재발행으로 기록됩니다.")}
                    onChange={(event) => setChangeSummary(event.target.value)}
                  />
                </label>
              </>
            )}
          </DialogBody>
          {publishDone ? null : (
            <DialogFooter className="bg-white py-3">
              <Button scale="sm" variant="ghost" disabled={status === "publishing"} onClick={() => setPublishOpen(false)}>
                {shellText(labels, "shellCancel", "취소")}
              </Button>
              <Button scale="sm" onClick={() => void publish()} disabled={status === "publishing"}>
                {status === "publishing" ? shellText(labels, "shellPublishing", "발행 중") : shellText(labels, "shellPublishConfirm", "이 내용으로 발행")}
              </Button>
            </DialogFooter>
          )}
        </DialogShell>
      ) : null}
    </div>
  );
}
