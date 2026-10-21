"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { applySampleCopy, unitTypeNames, withUnitTypeOptions } from "@/modules/templates/definitions";
import { canDuplicate, duplicateSection, pinSectionOrder } from "@/modules/sections/duplicate";
import { ApiError } from "@/lib/errors";
import { LandingPage } from "@/modules/templates/render/landing-page";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DialogBody, DialogFooter, DialogHeader, DialogShell } from "@/components/ui/dialog-shell";
import { useDialogFocusTrap } from "@/lib/a11y/dialog-focus";
import { PropertyPanel } from "@/modules/editor/property-panel";
import { CheckpointDialog } from "@/modules/editor/checkpoint-dialog";
import { UploadError, uploadProjectFile } from "@/modules/editor/prepare-upload";
import { orgText } from "@/modules/admin/org-copy";
import type { CanvasEdit } from "@/modules/editor/edit-context";
import type { PageSection, PageSnapshot } from "@/types";

const STATUS_LABEL: Record<string, [string, string]> = {
  loading: ["shellStatusLoading", "불러오는 중"],
  dirty: ["shellStatusDirty", "미발행 변경사항 있음"],
  saved: ["shellStatusSaved", "저장됨"],
  saving: ["shellStatusSaving", "저장 중"],
  save_failed: ["shellStatusSaveFailed", "저장 실패"],
  publishing: ["shellStatusPublishing", "발행 중"],
  published: ["shellStatusPublished", "발행됨"],
};

function shellText(settings: Record<string, unknown> | undefined, key: string, fallback: string) {
  return String(settings?.[key] ?? "").trim() || fallback;
}

function showStatus(settings: Record<string, unknown> | undefined, status: string) {
  const item = STATUS_LABEL[status];
  return item ? shellText(settings, item[0], item[1]) : status;
}

function PreviewModeBanner({ hiddenCount, settings }: { hiddenCount: number; settings: Record<string, unknown> }) {
  const hidden = shellText(settings, "shellHiddenCount", "숨긴 섹션 {count}개").replace("{count}", String(hiddenCount));
  return (
    <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-border bg-surface px-4 py-3 text-sm text-text-body">
      <p>{shellText(settings, "shellPreviewBanner", "고객에게 보이는 화면입니다. 문구와 이미지는 편집에서 고칩니다.")}</p>
      {hiddenCount > 0 ? <span className="rounded-[8px] bg-white px-2 py-1 text-xs font-semibold text-text-muted">{hidden}</span> : null}
    </div>
  );
}

function EditModeBanner({ settings }: { settings: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(window.localStorage.getItem("adone-edit-hint") !== "1");
  }, []);
  if (!open) return null;
  return (
    <div role="status" className="flex items-start justify-between gap-3 rounded-[14px] border border-border bg-primary-soft px-4 py-3 text-sm text-text-body shadow-none">
      <p>{shellText(settings, "shellEditHint", "문구와 이미지를 클릭하면 바로 고칠 수 있습니다. 섹션 순서와 노출은 왼쪽에서 조절합니다.")}</p>
      <button
        type="button"
        className="shrink-0 font-semibold text-primary"
        onClick={() => {
          window.localStorage.setItem("adone-edit-hint", "1");
          setOpen(false);
        }}
      >
        {shellText(settings, "shellEditHintOk", "확인")}
      </button>
    </div>
  );
}

const SECTION_NAME: Record<string, [string, string]> = {
  hero: ["shellSectionHero", "히어로"],
  overview: ["shellSectionOverview", "사업개요"],
  location: ["shellSectionLocation", "입지"],
  premium: ["shellSectionPremium", "특장점"],
  gallery: ["shellSectionGallery", "갤러리"],
  floorplan: ["shellSectionFloorplan", "평면"],
  directions: ["shellSectionDirections", "찾아오는 길"],
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

function missingImageNote(section: PageSection, settings: Record<string, unknown>) {
  const content = section.content;
  const name = section.title || sectionLabel(settings, section.sectionType);
  if (section.sectionType === "hero") {
    const hasMedia = String(content.imageUrl ?? "").trim() || String(content.videoUrl ?? "").trim();
    if (!hasMedia) return fillNote(shellText(settings, "noteHeroMedia", "{name}에 대표 이미지나 영상이 없습니다."), { name });
  }
  if (section.sectionType === "gallery" && filledUrls(content.images) === 0) return fillNote(shellText(settings, "notePhotos", "{name}에 사진이 없습니다."), { name });
  if (section.sectionType === "location" && filledUrls(content.images) === 0) return fillNote(shellText(settings, "notePhotos", "{name}에 사진이 없습니다."), { name });
  if (section.sectionType === "premium") {
    const cards = Array.isArray(content.cards) ? (content.cards as Array<{ imageUrl?: string }>) : [];
    const cardImages = cards.filter((item) => String(item.imageUrl ?? "").trim()).length;
    if (filledUrls(content.images) + cardImages === 0) return fillNote(shellText(settings, "notePhotos", "{name}에 사진이 없습니다."), { name });
  }
  if (section.sectionType === "floorplan") {
    const types = (content.types as Array<{ imageUrl?: string; images?: Array<{ url?: string }> }> | undefined) ?? [];
    const empty = types.filter((type) => filledUrls(type.images) === 0 && !String(type.imageUrl ?? "").trim()).length;
    if (empty > 0) return fillNote(shellText(settings, "noteFloorplan", "{name}에 도면이 없는 타입이 {count}개 있습니다."), { name, count: empty });
  }
  if (section.sectionType === "directions" && !String(content.mapImageUrl ?? "").trim()) return fillNote(shellText(settings, "noteMap", "{name}에 약도 이미지가 없습니다."), { name });
  return null;
}

function publishNotes(snapshot: PageSnapshot) {
  const settings = snapshot.globalSettings;
  const notes: string[] = [];
  for (const section of snapshot.sections) {
    if (!section.isVisible) continue;
    const count = countPlaceholder(section.content, settings);
    if (count > 0) notes.push(fillNote(shellText(settings, "notePlaceholders", "{name}에 안내 문장이 {count}곳 남아 있습니다."), { name: section.title || sectionLabel(settings, section.sectionType), count }));
    const imageNote = missingImageNote(section, settings);
    if (imageNote) notes.push(imageNote);
  }
  const popup = snapshot.globalSettings.popup as { enabled?: boolean; imageUrl?: string } | undefined;
  if (popup?.enabled && !String(popup.imageUrl ?? "").trim()) notes.push(shellText(settings, "notePopupImage", "팝업이 켜져 있지만 이미지가 없습니다."));
  const form = snapshot.sections.find((section) => section.sectionType === "lead_form" && section.isVisible);
  const url = String(form?.content.externalRegisterUrl ?? "").trim();
  if (form && !/^https?:\/\//i.test(url)) {
    notes.push(shellText(settings, "noteExternalForm", "외부 관심고객 주소가 없습니다. 등록 버튼은 이 페이지의 등록 화면으로 이동합니다. 실제 수집은 아직 시작하지 않습니다."));
  }
  return notes;
}

function PublishChecklist({ snapshot, onOpen }: { snapshot: PageSnapshot; onOpen: (target: string) => void }) {
  const settings = snapshot.globalSettings;
  const hero = snapshot.sections.find((section) => section.sectionType === "hero");
  const directions = snapshot.sections.find((section) => section.sectionType === "directions");
  const legal = snapshot.sections.find((section) => section.sectionType === "legal");
  const floorplan = snapshot.sections.find((section) => section.sectionType === "floorplan");
  const address = String(directions?.content.address ?? "").trim();
  const notices = (legal?.content.notices as Array<{ text?: string }> | undefined) ?? [];
  const types = (floorplan?.content.types as Array<{ name?: string }> | undefined) ?? [];
  const items = [
    { target: "hero", label: shellText(settings, "checkName", "현장명"), ok: snapshot.projectName.trim().length > 0 && snapshot.projectName !== shellText(settings, "phSite", "현장명") },
    { target: "hero", label: shellText(settings, "checkPhone", "대표 전화"), ok: snapshot.phone.trim().length > 0 },
    { target: "logo", label: shellText(settings, "checkLogo", "로고"), ok: String(snapshot.globalSettings.logoUrl ?? "").trim().length > 0 },
    { target: "hero", label: shellText(settings, "checkHeroImage", "대표 이미지"), ok: String(hero?.content.imageUrl ?? "").trim().length > 0 || String(hero?.content.videoUrl ?? "").trim().length > 0 },
    { target: "hero", label: shellText(settings, "checkMobileImage", "모바일 이미지"), ok: String(hero?.content.mobileImageUrl ?? "").trim().length > 0 },
    { target: "directions", label: shellText(settings, "checkAddress", "주소"), ok: address.length > 0 && address !== shellText(settings, "seedDirectionsAddress", "현장 주소를 입력하세요.") },
    { target: "legal", label: shellText(settings, "checkParties", "시행 또는 시공"), ok: String(legal?.content.developerName ?? "").trim().length > 0 || String(legal?.content.builderName ?? "").trim().length > 0 },
    { target: "legal", label: shellText(settings, "checkNotices", "고지 문장"), ok: notices.some((notice) => String(notice.text ?? "").trim().length > 0) },
    { target: "floorplan", label: shellText(settings, "checkFloorplan", "평면 타입명"), ok: types.some((type) => String(type.name ?? "").trim().length > 0) },
    { target: "privacy", label: shellText(settings, "checkPrivacy", "개인정보 처리 주체"), ok: snapshot.privacy.collectingControllerName.trim() !== "" && snapshot.privacy.collectingControllerName !== "처리주체미정" },
  ];
  const missing = items.filter((item) => !item.ok).length;
  const hasLabel = shellText(settings, "shellHas", "있음");
  const missingLabel = shellText(settings, "shellMissing", "없음");
  return (
    <div className="mb-4 rounded-[16px] border border-border p-4" aria-labelledby="publish-checklist-title">
      <p id="publish-checklist-title" className="text-sm font-semibold">
        {shellText(settings, "shellChecklistTitle", "발행 전에 확인할 것")}
      </p>
      <p className="mt-1 text-xs text-text-muted">{shellText(settings, "shellChecklistBody", "항목을 누르면 그 칸으로 이동합니다. 없어도 발행은 됩니다.")}</p>
      <p className="mt-2 text-xs text-text-muted" role="status" aria-live="polite">
        {shellText(settings, "shellChecklistMissingCount", "없는 항목 {count}개").replace("{count}", String(missing))}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li key={`${item.target}-${index}`}>
            <button
              type="button"
              className="flex w-full items-center justify-between text-left text-sm"
              aria-label={`${item.label}: ${item.ok ? hasLabel : missingLabel}`}
              onClick={() => onOpen(item.target)}
            >
              <span>{item.label}</span>
              <span className={item.ok ? "text-primary" : "text-text-muted"}>{item.ok ? hasLabel : missingLabel}</span>
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

function scrollToSection(anchorId: string) {
  const node = document.getElementById(anchorId);
  const scroller = node?.closest("[data-preview-scroll]");
  if (node && scroller instanceof HTMLElement) {
    const top = node.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 12;
    scroller.scrollTo({ top, behavior: "smooth" });
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
      className={`relative h-5 w-[34px] shrink-0 rounded-full ${checked ? "bg-primary" : "bg-border"}`}
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
  viewed,
  settings,
  onToggle,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  section: PageSection;
  viewed: boolean;
  settings: Record<string, unknown>;
  onToggle: () => void;
  onSelect: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id, disabled: section.isRequired });
  const title = section.isOriginal ? section.title : `${section.title} ${shellText(settings, "shellCopySuffix", "복제")}`;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex min-h-[34px] items-center gap-1.5 rounded-[14px] px-0.5 ${section.isVisible ? "" : "opacity-55"} ${section.isRequired ? "" : "cursor-grab"}`}
      {...(section.isRequired ? {} : { ...attributes, ...listeners })}
    >
      {section.isRequired ? (
        <span className="inline-flex w-[18px] shrink-0 justify-center text-text-muted" title={shellText(settings, "shellPinned", "고정")} aria-hidden>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
            <path d="M12 17v5" />
            <path d="M9 10.8 12 3l3 7.8" />
            <path d="M5 10.8h14L12 21" />
          </svg>
        </span>
      ) : (
        <span className="inline-flex w-[18px] shrink-0 justify-center text-border" aria-hidden>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.4" />
            <circle cx="15" cy="6" r="1.4" />
            <circle cx="9" cy="12" r="1.4" />
            <circle cx="15" cy="12" r="1.4" />
            <circle cx="9" cy="18" r="1.4" />
            <circle cx="15" cy="18" r="1.4" />
          </svg>
        </span>
      )}
      <button
        type="button"
        className={`min-w-0 flex-1 truncate rounded-[14px] px-2.5 py-1.5 text-left text-xs font-semibold ${viewed ? "bg-primary text-white" : "text-text-body hover:bg-surface"}`}
        onClick={onSelect}
      >
        {title}
      </button>
      {onDuplicate || onDelete ? (
        <span className="hidden shrink-0 items-center gap-1 group-hover:flex">
          {onDuplicate ? (
            <button type="button" className="text-[11px] font-semibold text-primary" onPointerDown={(event) => event.stopPropagation()} onClick={onDuplicate}>
              {shellText(settings, "shellDuplicate", "복제")}
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="text-[11px] text-text-muted" onPointerDown={(event) => event.stopPropagation()} onClick={onDelete}>
              {shellText(settings, "editRemove", "삭제")}
            </button>
          ) : null}
        </span>
      ) : null}
      {section.isRequired ? null : (
        <SectionSwitch
          checked={section.isVisible}
          label={shellText(settings, "shellSectionVisible", "{name} 페이지 노출").replace("{name}", section.title)}
          title={shellText(settings, "shellVisibleToggle", "이 구간을 페이지에 표시합니다.")}
          onClick={onToggle}
        />
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
  return (
    <div className="space-y-4">
      {showToggle ? (
        <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold">{shellText(settings, "shellPopup", "이벤트 팝업")}</p>
            <p className="mt-0.5 text-xs text-text-muted">{shellText(settings, "shellPopupIntro", "방문 시 한 번 보이는 안내")}</p>
          </div>
          <SectionSwitch
            checked={popup.enabled !== false}
            label={shellText(settings, "shellPopup", "이벤트 팝업")}
            onClick={() => onChange({ ...popup, enabled: popup.enabled === false })}
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
          <input className="ui-field h-11 min-h-11 text-sm" value={popup.banner ?? ""} placeholder={shellText(settings, "shellPopupBannerPh", "방문 고객 안내")} onChange={(event) => onChange({ ...popup, banner: event.target.value })} />
        </PopupField>
        <PopupField label={shellText(settings, "shellPopupCta", "버튼 문구")}>
          <input className="ui-field h-11 min-h-11 text-sm" value={popup.ctaLabel ?? ""} placeholder={shellText(settings, "shellPopupCtaPh", "관심고객 등록")} onChange={(event) => onChange({ ...popup, ctaLabel: event.target.value })} />
        </PopupField>
      </div>
      <PopupField label={shellText(settings, "shellPopupTitleField", "제목")}>
        <input className="ui-field h-11 min-h-11 text-sm" value={popup.title ?? ""} placeholder={shellText(settings, "shellPopupTitlePh", "관심고객으로 등록해 주세요")} onChange={(event) => onChange({ ...popup, title: event.target.value })} />
      </PopupField>
      <PopupField label={shellText(settings, "shellPopupBodyField", "본문")}>
        <textarea className="ui-field min-h-[4.5rem] py-2.5 text-sm" value={popup.body ?? ""} placeholder={shellText(settings, "shellPopupBodyPh", "상담 안내를 받으려면 이름과 연락처를 남겨 주세요.")} onChange={(event) => onChange({ ...popup, body: event.target.value })} />
      </PopupField>
      <PopupField label={shellText(settings, "shellPopupPerks", "혜택")}>
        <textarea className="ui-field min-h-[4.5rem] py-2.5 text-sm" value={(popup.perks ?? []).join("\n")} placeholder={shellText(settings, "shellPopupPerksPh", "한 줄에 하나씩\n청약 일정 안내")} onChange={(event) => onChange({ ...popup, perks: event.target.value.split("\n") })} />
      </PopupField>
      <PopupField label={shellText(settings, "shellPopupDisclaimer", "안내 문장")}>
        <input className="ui-field h-11 min-h-11 text-sm" value={popup.disclaimer ?? ""} placeholder={shellText(settings, "shellPopupDisclaimerPh", "관심고객 등록은 청약 접수가 아닙니다.")} onChange={(event) => onChange({ ...popup, disclaimer: event.target.value })} />
      </PopupField>
      <div className="grid gap-3 sm:grid-cols-2">
        <PopupField label={shellText(settings, "shellPopupPhone", "팝업 전화")}>
          <input className="ui-field h-11 min-h-11 text-sm" value={popup.phone ?? ""} placeholder={shellText(settings, "shellPopupPhonePh", "비우면 대표 전화")} onChange={(event) => onChange({ ...popup, phone: event.target.value })} />
        </PopupField>
        <PopupField label={shellText(settings, "shellPopupPhonePrefix", "전화 앞 문구")}>
          <input className="ui-field h-11 min-h-11 text-sm" value={popup.phonePrefix ?? ""} placeholder={shellText(settings, "shellPopupPhonePrefixPh", "바로 상담")} onChange={(event) => onChange({ ...popup, phonePrefix: event.target.value })} />
        </PopupField>
        <PopupField label={shellText(settings, "shellPopupCloseField", "닫기")}>
          <input className="ui-field h-11 min-h-11 text-sm" value={popup.closeLabel ?? ""} placeholder={shellText(settings, "shellPopupClosePh", "닫기")} onChange={(event) => onChange({ ...popup, closeLabel: event.target.value })} />
        </PopupField>
        <PopupField label={shellText(settings, "shellPopupEmpty", "배너가 없을 때")}>
          <input className="ui-field h-11 min-h-11 text-sm" value={popup.emptyImageLabel ?? ""} placeholder={shellText(settings, "shellPopupEmptyPh", "배너 이미지")} onChange={(event) => onChange({ ...popup, emptyImageLabel: event.target.value })} />
        </PopupField>
        <PopupField label={shellText(settings, "shellPopupHideToday", "오늘 하루 보지 않기")}>
          <input className="ui-field h-11 min-h-11 text-sm" value={popup.hideTodayLabel ?? ""} placeholder={shellText(settings, "shellPopupHideTodayPh", "오늘 하루 보지 않기")} onChange={(event) => onChange({ ...popup, hideTodayLabel: event.target.value })} />
        </PopupField>
      </div>
      <Button type="button" variant="soft" className="h-11 w-full text-[15px]" onClick={onPreview}>
        {shellText(settings, "shellPopupPreview", "팝업 미리보기")}
      </Button>
    </div>
  );
}

export function EditorShell({ projectId }: { projectId: string }) {
  const [data, setData] = useState<DraftResponse | null>(null);
  const [status, setStatus] = useState("loading");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile" | "split">("desktop");
  const [editing, setEditing] = useState(true);
  const [popupOpen, setPopupOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [checkpointOpen, setCheckpointOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [publishDone, setPublishDone] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [listOpen, setListOpen] = useState(true);
  const [popupFormOpen, setPopupFormOpen] = useState(false);
  const [viewedAnchor, setViewedAnchor] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [sampleConfirmOpen, setSampleConfirmOpen] = useState(false);
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);
  const dataRef = useRef<DraftResponse | null>(null);
  const pendingRef = useRef<{ sections: PageSection[]; extra?: Partial<DraftResponse["draft"]> } | null>(null);
  const timerRef = useRef<number | null>(null);
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const saveTailRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const statusRef = useRef(status);
  const helpPanelRef = useRef<HTMLDivElement>(null);
  const publishPanelRef = useRef<HTMLDivElement>(null);
  const popupPanelRef = useRef<HTMLDivElement>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  statusRef.current = status;
  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
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
    if (!window.matchMedia("(min-width: 1024px)").matches) setListOpen(false);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function adoptLatestDraft(message: string) {
    pendingRef.current = null;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    pastRef.current = [];
    futureRef.current = [];
    syncHistoryFlags();
    setSelectedId(null);
    setSettingsOpen(false);
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
      pastRef.current = [];
      futureRef.current = [];
      syncHistoryFlags();
      setSelectedId(null);
      setSettingsOpen(false);
      setData(json);
      dataRef.current = json;
      setStatus(json.project.hasUnpublishedChanges ? "dirty" : "saved");
      setError(shellText(current.draft.globalSettings, "shellDraftReloaded", "다른 화면에서 작업본이 바뀌어 최신 내용을 불러왔습니다."));
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [projectId]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!pendingRef.current) return;
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
    setStatus(json.project.hasUnpublishedChanges ? "dirty" : "saved");
  }

  useEffect(() => {
    load();
  }, [projectId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.isContentEditable || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT");
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        setCheckpointOpen(true);
        return;
      }
      if (!typing && !meta && event.key.toLowerCase() === "p") {
        event.preventDefault();
        setEditing((value) => !value);
        return;
      }
      if (!typing && !meta && event.key === "?") {
        event.preventDefault();
        setHelpOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") {
        setHelpOpen(false);
        if (!typing) {
          if (statusRef.current !== "publishing") setPublishOpen(false);
          setCheckpointOpen(false);
          setSettingsOpen(false);
          if (!window.matchMedia("(min-width: 1024px)").matches) setListOpen(false);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (status === "saving" || status === "save_failed") {
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
      sections: data.sections,
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

  function syncHistoryFlags() {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }

  function undo() {
    const current = dataRef.current;
    const previous = pastRef.current.pop();
    if (!current || !previous) return;
    futureRef.current.push(capture(current));
    syncHistoryFlags();
    persist(previous.sections, previous, false);
  }

  function redo() {
    const current = dataRef.current;
    const next = futureRef.current.pop();
    if (!current || !next) return;
    pastRef.current.push(capture(current));
    syncHistoryFlags();
    persist(next.sections, next, false);
  }

  async function persist(next: DraftResponse["sections"], extra?: Partial<DraftResponse["draft"]>, recordHistory = true) {
    const current = dataRef.current;
    if (!current) return;
    if (recordHistory) {
      pastRef.current = [...pastRef.current, capture(current)].slice(-40);
      futureRef.current = [];
      syncHistoryFlags();
    }
    const merged: DraftResponse = {
      ...current,
      sections: next,
      draft: extra ? { ...current.draft, ...extra } : current.draft,
      project: { ...current.project, hasUnpublishedChanges: true },
    };
    const siteName = String(merged.draft.globalSettings.siteName ?? "").trim();
    if (siteName) merged.project = { ...merged.project, name: siteName };
    dataRef.current = merged;
    setData(merged);
    pendingRef.current = { sections: next, extra };
    setStatus("saving");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      enqueueSave();
    }, 700);
  }

  function enqueueSave() {
    saveTailRef.current = saveTailRef.current.then(() => flushSave());
    return saveTailRef.current;
  }

  async function flushSave() {
    while (pendingRef.current && dataRef.current) {
      const current = dataRef.current;
      const pending = pendingRef.current;
      pendingRef.current = null;
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
      };
      dataRef.current = nextData;
      setData(nextData);
      setStatus("dirty");
      setError("");
    }
    setToast(shellText(dataRef.current?.draft.globalSettings, "shellSavedToast", "작업본을 저장했습니다"));
    return true;
  }

  async function publish() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
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
      setStatus("saved");
      setPublishOpen(false);
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
      scrollToSection("hero");
      return;
    }
    if (target === "privacy") {
      const legal = current.sections.find((section) => section.sectionType === "legal");
      if (legal) setSelectedId(legal.id);
      setSettingsOpen(true);
      return;
    }
    const section = current.sections.find((item) => item.sectionType === target);
    if (!section) return;
    setSelectedId(section.id);
    setSettingsOpen(true);
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

  const edit = useMemo<CanvasEdit | null>(() => {
    if (!editing || !data) return null;
    return {
      patch: (sectionId, content) => {
        const current = dataRef.current;
        if (!current) return;
        const previous = current.sections.find((section) => section.id === sectionId);
        const sections = current.sections.map((section) => (section.id === sectionId ? { ...section, content } : section));
        if (previous?.sectionType === "floorplan") {
          const names = unitTypeNames((content.types as Array<{ name?: string }>) ?? []);
          persist(sections, {
            formSettings: { ...current.draft.formSettings, fields: withUnitTypeOptions(current.draft.formSettings.fields, names) },
          });
          return;
        }
        persist(sections);
      },
      setPhone: (phone) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { globalSettings: { ...current.draft.globalSettings, phone } });
      },
      setSiteName: (name) => {
        const current = dataRef.current;
        if (!current) return;
        const sections = current.sections.map((section) =>
          section.sectionType === "hero" ? { ...section, content: { ...section.content, headline: name } } : section,
        );
        persist(sections, { globalSettings: { ...current.draft.globalSettings, siteName: name } });
      },
      setNavSubtitle: (navSubtitle) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { globalSettings: { ...current.draft.globalSettings, navSubtitle } });
      },
      setLogo: (logoUrl) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { globalSettings: { ...current.draft.globalSettings, logoUrl } });
      },
      setIntro: (intro) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { formSettings: { ...current.draft.formSettings, intro } });
      },
      setSuccessMessage: (successMessage) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { formSettings: { ...current.draft.formSettings, successMessage } });
      },
      setSuccessTitle: (successTitle) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { formSettings: { ...current.draft.formSettings, successTitle } });
      },
      setAgainLabel: (againLabel) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { formSettings: { ...current.draft.formSettings, againLabel } });
      },
      setSubmittingLabel: (submittingLabel) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { formSettings: { ...current.draft.formSettings, submittingLabel } });
      },
      setPreviewNote: (previewNote) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { formSettings: { ...current.draft.formSettings, previewNote } });
      },
      setPrivacy: (privacySettings) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { privacySettings });
      },
      setShareLabel: (shareLabel) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { globalSettings: { ...current.draft.globalSettings, shareLabel } });
      },
      setPageCopy: (patch) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { globalSettings: { ...current.draft.globalSettings, ...patch } });
      },
      setFields: (fields) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { formSettings: { ...current.draft.formSettings, fields } });
      },
      setPopup: (popup) => {
        const current = dataRef.current;
        if (!current) return;
        persist(current.sections, { globalSettings: { ...current.draft.globalSettings, popup } });
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
  const settingsSection = data.sections.find((section) => section.id === selectedId) ?? data.sections.find((section) => section.sectionType === "legal") ?? data.sections[0];
  const labels = data.draft.globalSettings;

  const toolClass = "inline-flex h-[34px] items-center gap-1.5 rounded-[14px] px-3 text-xs font-bold text-white/85 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";
  const popupSettings = (data.draft.globalSettings.popup ?? {}) as PopupSettingsValue;

  return (
    <div className="flex h-screen flex-col bg-surface">
      <header className="grid h-[60px] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-white/10 bg-text-primary px-5 text-white" aria-label="랜딩페이지 편집기">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link
            href="/admin/projects/new"
            className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 pl-2 pr-3.5 text-xs font-bold text-white/90 hover:bg-white/10"
            onClick={(event) => {
              if (status !== "dirty") return;
              const ok = window.confirm("템플릿 선택 화면으로 돌아갈까요?\n\n저장하지 않은 편집 내용은 유지되지 않을 수 있습니다.");
              if (!ok) event.preventDefault();
            }}
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25">
                <path d="M15 6 9 12l6 6" />
              </svg>
            </span>
            {shellText(labels, "shellExitTemplates", "템플릿 다시 설정")}
          </Link>
          <span className="h-7 w-px shrink-0 bg-white/15" aria-hidden />
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="shrink-0 text-[10px] font-extrabold tracking-[0.18em] text-primary">ADONEBRIDGE</span>
            <span className="shrink-0 text-[15px] font-extrabold tracking-tight">
              {editing ? shellText(labels, "shellEditing", "랜딩페이지 제작") : shellText(labels, "shellPreviewTitle", "미리보기")}
            </span>
            <span className="truncate text-[11px] font-medium text-white/50" role="status" aria-live="polite">
              {showStatus(labels, status)}
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
                className={`inline-flex h-[34px] items-center rounded-[14px] px-2.5 text-[11px] font-bold ${viewport === id ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                onClick={() => setViewport(id)}
              >
                {label}
              </button>
            ))}
          </nav>
        ) : (
          <span />
        )}
        <div className="flex items-center justify-end gap-2.5">
          {!editing ? (
            <button
              type="button"
              className={`${toolClass} ${popupSettings.enabled === false ? "opacity-45" : ""}`}
              disabled={popupSettings.enabled === false}
              onClick={() => setPopupOpen(true)}
            >
              {shellText(labels, "shellPopup", "이벤트 팝업")}
            </button>
          ) : null}
          <nav className="inline-flex items-center gap-0.5 rounded-[14px] border border-white/10 bg-white/5 p-1" aria-label="편집 도구">
            {editing ? (
              <>
                <button type="button" className={toolClass} disabled={!canUndo} title="Ctrl+Z" onClick={undo}>
                  {shellText(labels, "shellUndo", "실행 취소")}
                </button>
                <button type="button" className={`${toolClass} px-2`} disabled={!canRedo} title="Ctrl+Shift+Z" aria-label={shellText(labels, "shellRedo", "다시 실행")} onClick={redo}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                    <path d="M21 7v6h-6" />
                    <path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
                  </svg>
                </button>
                <button type="button" className={toolClass} onClick={() => setCheckpointOpen(true)}>
                  {shellText(labels, "shellCheckpoint", "임시 저장")}
                </button>
              </>
            ) : null}
            <button
              type="button"
              className={toolClass}
              onClick={() => {
                setEditing((value) => !value);
                setPopupOpen(false);
                if (!editing) setViewport("desktop");
              }}
            >
              {editing ? shellText(labels, "shellPreview", "미리보기") : shellText(labels, "shellKeepEditing", "편집 계속")}
            </button>
          </nav>
          <button
            type="button"
            data-testid="publish-button"
            className="inline-flex h-[38px] items-center rounded-[14px] bg-primary px-4 text-[13px] font-extrabold text-white hover:bg-primary-hover"
            onClick={() => {
              setPublishDone(false);
              setPublishOpen(true);
            }}
          >
            {data.project.status === "PUBLISHED" ? shellText(labels, "shellRepublish", "재발행") : shellText(labels, "shellPublish", "발행하기")}
          </button>
        </div>
      </header>
      {error ? (
        <p className="bg-[#fdeeee] px-4 py-2 text-sm text-danger" role="alert" aria-live="assertive">
          {error}
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
      {editing && listOpen ? (
        <button type="button" className="fixed inset-0 top-[60px] z-20 bg-text-primary/40 lg:hidden" aria-label={shellText(labels, "shellListClose", "섹션 목록 닫기")} onClick={() => setListOpen(false)} />
      ) : null}
      <div className={`grid min-h-0 flex-1 ${editing ? (listOpen ? "lg:grid-cols-[280px_1fr]" : "lg:grid-cols-[44px_1fr]") : "grid-cols-1"}`}>
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
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3.5">
          <ConfirmDialog
            open={sampleConfirmOpen}
            title={shellText(labels, "shellSample", "샘플 센터")}
            description={shellText(labels, "shellSampleConfirm", "샘플 문장으로 섹션 글을 채울까요? 지금 적은 글은 샘플 문장으로 바뀝니다.")}
            onCancel={() => setSampleConfirmOpen(false)}
            onConfirm={() => {
              setSampleConfirmOpen(false);
              persist(applySampleCopy(data.sections, data.draft.globalSettings), {
                globalSettings: {
                  ...data.draft.globalSettings,
                  popup: {
                    ...((data.draft.globalSettings.popup ?? {}) as PopupSettingsValue),
                    enabled: true,
                    banner: shellText(labels, "shellSamplePopupBanner", "방문 고객 안내"),
                    title: shellText(labels, "shellSamplePopupTitle", "관심고객으로 등록해 주세요"),
                    body: shellText(labels, "shellSamplePopupBody", "상담 안내를 받으려면 이름과 연락처를 남겨 주세요."),
                  },
                },
              });
            }}
          />
          <ConfirmDialog
            open={Boolean(deleteSectionId)}
            title={shellText(labels, "editRemove", "삭제")}
            description={shellText(labels, "shellSectionDeleteConfirm", "이 복제 섹션을 삭제할까요?")}
            danger
            onCancel={() => setDeleteSectionId(null)}
            onConfirm={() => {
              const id = deleteSectionId;
              setDeleteSectionId(null);
              if (!id) return;
              persist(data.sections.filter((item) => item.id !== id).map((item, index) => ({ ...item, sortOrder: index })));
            }}
          />
          <div className="rounded-[16px] border border-border bg-white p-3">
          <h2 className="text-[13px] font-semibold">{shellText(labels, "shellSections", "섹션")}</h2>
          <p className="mt-1 text-[11px] leading-snug text-text-muted">{shellText(labels, "shellSectionHint", "드래그하여 순서를 바꿉니다.")}</p>
          <DndContext sensors={dragSensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={data.sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
              <div className="mt-2.5 flex flex-col gap-0.5">
                {data.sections.map((section) => (
                  <SortableRow
                    key={section.id}
                    section={section}
                    settings={labels}
                    viewed={section.anchorId === viewedAnchor}
                    onSelect={() => {
                      setSelectedId(section.id);
                      setSettingsOpen(false);
                      scrollToSection(section.anchorId);
                      if (!window.matchMedia("(min-width: 1024px)").matches) setListOpen(false);
                    }}
                    onToggle={() => {
                      persist(
                        data.sections.map((item) =>
                          item.id === section.id ? { ...item, isVisible: !item.isVisible, showInGnb: !item.isVisible } : item,
                        ),
                      );
                    }}
                    onDuplicate={
                      !section.isRequired && canDuplicate(data.sections, section.rootSectionId)
                        ? () => {
                            try {
                              persist(duplicateSection({ sections: data.sections, selectedSectionId: section.id, projectId }));
                              setError("");
                            } catch (caught) {
                              setError(caught instanceof ApiError ? caught.message : shellText(labels, "shellDuplicateFail", "복제하지 못했습니다."));
                            }
                          }
                        : undefined
                    }
                    onDelete={section.isOriginal ? undefined : () => setDeleteSectionId(section.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          </div>
          <div className="rounded-[16px] border border-border bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <button type="button" className="min-w-0 flex-1 rounded-[14px] text-left hover:bg-primary-soft" onClick={() => setPopupFormOpen(true)}>
                <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                  </svg>
                  {shellText(labels, "shellPopup", "이벤트 팝업")}
                </span>
                <span className="mt-1 block text-[11px] leading-snug text-text-muted">{shellText(labels, "shellPopupIntro", "방문 시 한 번 보이는 안내")}</span>
              </button>
              <SectionSwitch
                checked={popupSettings.enabled !== false}
                label={shellText(labels, "shellPopup", "이벤트 팝업")}
                onClick={() => persist(data.sections, { globalSettings: { ...data.draft.globalSettings, popup: { ...popupSettings, enabled: popupSettings.enabled === false } } })}
              />
            </div>
          </div>
          <details className="px-1 text-xs font-medium text-text-muted">
            <summary className="cursor-pointer">{shellText(labels, "shellMore", "더보기")}</summary>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            <button
              type="button"
              className="hover:text-text-primary"
              onClick={() => {
                const legal = data.sections.find((section) => section.sectionType === "legal");
                if (legal) setSelectedId(legal.id);
                setSettingsOpen(true);
              }}
            >
              {shellText(labels, "shellPageSettings", "페이지 설정")}
            </button>
            <button type="button" className="hover:text-text-primary" onClick={() => setHelpOpen(true)}>
              {shellText(labels, "shellShortcuts", "단축키")}
            </button>
            <button type="button" className="hover:text-text-primary" onClick={() => setSampleConfirmOpen(true)}>
              {shellText(labels, "shellSample", "샘플 센터")}
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
          ) : null}
        </aside>
        ) : null}
        <div className={`flex min-h-0 flex-col overflow-hidden ${viewport === "desktop" || viewport === "split" ? "bg-white" : "bg-surface p-4"}`}>
          {editing ? null : <PreviewModeBanner hiddenCount={data.sections.filter((section) => !section.isVisible).length} settings={labels} />}
          <div data-preview-scroll className={`relative mx-auto h-full min-h-0 flex-1 overflow-auto bg-white ${viewport === "desktop" || viewport === "split" ? "w-full" : `rounded-[16px] border border-border ${width}`}`}>
            <LandingPage
              snapshot={snapshot}
              mode="preview"
              variant={viewport === "split" ? "desktop" : viewport}
              edit={edit}
              highlightId={selectedId}
              showPopup={popupOpen}
              onClosePopup={() => setPopupOpen(false)}
              onActiveAnchor={setViewedAnchor}
            />
            {editing ? (
              <div className="pointer-events-none sticky bottom-4 z-10 flex justify-center px-4">
                <div className="pointer-events-auto max-w-xl">
                  <EditModeBanner settings={labels} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {settingsOpen && settingsSection ? (
        <div className="fixed inset-y-0 right-0 z-30 w-full max-w-md overflow-y-auto border-l border-border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold">{settingsSection.title}</p>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>
              {shellText(labels, "shellClose", "닫기")}
            </Button>
          </div>
          <PropertyPanel
            selected={settingsSection}
            snapshot={snapshot}
            projectId={projectId}
            onSectionChange={(nextSection, patch) => {
              persist(
                data.sections.map((item) => (item.id === nextSection.id ? nextSection : item)),
                patch,
              );
            }}
            onPhoneChange={(phone) => persist(data.sections, { globalSettings: { ...data.draft.globalSettings, phone } })}
            onDraftChange={(patch) => persist(data.sections, patch)}
          />
        </div>
      ) : null}
      {popupFormOpen ? (
        <DialogShell titleId="popup-settings-title" panelRef={popupPanelRef} onClose={() => setPopupFormOpen(false)} closeLabel={shellText(labels, "shellClose", "닫기")} size="lg">
          <DialogHeader titleId="popup-settings-title" title={shellText(labels, "shellPopup", "이벤트 팝업")} onClose={() => setPopupFormOpen(false)} closeLabel={shellText(labels, "shellClose", "닫기")} />
          <DialogBody>
            <PopupSettings
              popup={popupSettings}
              settings={labels}
              showToggle={false}
              onChange={(popup) => persist(data.sections, { globalSettings: { ...data.draft.globalSettings, popup } })}
              onUpload={(file) => uploadProjectFile(projectId, file)}
              onPreview={() => {
                setPopupFormOpen(false);
                setPopupOpen(true);
              }}
            />
          </DialogBody>
        </DialogShell>
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
            <Button className="h-11 px-4 text-[15px]" onClick={() => setHelpOpen(false)}>{shellText(labels, "shellClose", "닫기")}</Button>
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={`/${snapshot.publicSlug}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-[14px] bg-primary px-4 text-[15px] font-semibold text-white">
                    {shellText(labels, "shellLive", "발행 페이지")}
                  </a>
                  <Link href={`/admin/projects/${projectId}/versions`} className="inline-flex h-11 items-center rounded-[14px] border border-border px-4 text-[15px] font-semibold">
                    {shellText(labels, "shellVersions", "버전 기록")}
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-text-body">{shellText(labels, "shellPublishBody", "없는 항목이 있어도 발행할 수 있습니다. 항목을 누르면 그 칸으로 이동합니다. 개인정보 처리 주체가 확정되지 않으면 발행이 거절될 수 있습니다.")}</p>
                {(() => {
                  const notes = publishNotes(snapshot);
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
                    className="ui-field mt-2 min-h-20 py-2.5 text-sm"
                    maxLength={200}
                    value={changeSummary}
                    placeholder={shellText(labels, "shellPublishMemoPlaceholder", "비우면 최초 발행 또는 재발행으로 기록됩니다.")}
                    onChange={(event) => setChangeSummary(event.target.value)}
                  />
                </label>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            {publishDone ? (
              <Button variant="ghost" className="h-11 px-4 text-[15px]" onClick={() => setPublishOpen(false)}>
                {shellText(labels, "shellClose", "닫기")}
              </Button>
            ) : (
              <>
                <Button variant="ghost" className="h-11 px-4 text-[15px]" disabled={status === "publishing"} onClick={() => setPublishOpen(false)}>
                  {shellText(labels, "shellCancel", "취소")}
                </Button>
                <Button className="h-11 px-4 text-[15px]" onClick={() => void publish()} disabled={status === "publishing"}>
                  {status === "publishing" ? shellText(labels, "shellPublishing", "발행 중") : shellText(labels, "shellPublishConfirm", "이 내용으로 발행")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogShell>
      ) : null}
    </div>
  );
}
