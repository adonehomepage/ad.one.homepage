"use client";

import { createContext, useContext, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { PageSection, PageSnapshot } from "@/types";
import { isDefaultSampleLogo, isPopupEnabled, directionsRoutes, DIRECTIONS_ROUTE_MAX, faqItems, FAQ_ITEM_MAX, FLOORPLAN_TYPE_MAX, floorplanImages, floorplanSpecs, FLOORPLAN_SPEC_MAX, floorplanTabLabel, GALLERY_IMAGE_MAX, heroGalleryImages, HERO_TAG_MAX, imageAltText, imageDisplayCaption, legalNotices, LOCATION_CARD_MAX, locationCards, LOCATION_MATRIX_DEFAULTS, locationMatrix, OVERVIEW_FACT_MAX, OVERVIEW_SCHEDULE_MAX, OVERVIEW_STAT_MAX, POPUP_PERK_MAX, PREMIUM_ICON_DEFS, PREMIUM_ICONS, PREMIUM_ITEM_MAX, premiumIconSrc, premiumItems, resolvePremiumIcon, SAMPLE_LOGO_URL, sectionEyebrowText, sectionGalleryImages, sectionGallerySlots, withFloorplanImages, withFloorplanSpecs, type FloorplanImage, type GalleryImageSlot, type LocationMatrixItem, type PremiumIcon, type PremiumItem } from "@/modules/templates/definitions";
import { clampLaunchExcludedSection, gnbItemsFromSections, isLaunchExcludedSectionType } from "@/modules/sections/duplicate";
import { LeadForm } from "@/modules/templates/render/lead-form";
import { TrackedLink, TrackedSection } from "@/modules/templates/render/tracker";
import { CanvasEditContext, EditorChromeContext, chromeText, useEditorChrome, type CanvasEdit, useCanvasEdit } from "@/modules/editor/edit-context";
import { InlineText, MarkedText } from "@/modules/editor/inline-text";
import { useDialogFocusTrap } from "@/lib/a11y/dialog-focus";
import { cn } from "@/lib/cn";
import "@/modules/templates/render/presale-foreon.css";
import "@/modules/templates/render/presale-midday.css";
import "@/modules/templates/render/presale-midday-bridge.css";
import { MiddayTitleReveal } from "@/modules/templates/render/midday-title-reveal";
import { MiddayOriginHost } from "@/modules/templates/midday-origin/MiddayOriginHost";
import type { PresaleLandingData } from "@/modules/templates/midday-origin/types/presale-landing";
import { SAMPLE_SITE } from "@/modules/templates/sample-site";
import { OakOriginHost } from "@/modules/templates/oak-editorial/OakOriginHost";
import type { OakEditorialData } from "@/modules/templates/oak-editorial/types";

function visible(sections: PageSection[]) {
  return [...sections].filter((section) => section.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
}

function leadFormSection(snapshot: PageSnapshot) {
  return snapshot.sections.find((section) => section.sectionType === "lead_form" && section.isVisible);
}

function leadInquiryAnchor(snapshot: PageSnapshot) {
  return leadFormSection(snapshot)?.anchorId || "inquiry";
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = () => setMatches(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

/** 편집 기기 틀 + 공개 화면 실제 폭을 맞춘 레이아웃. */
type ViewLayout = "mobile" | "tablet" | "desktop";

function layoutCols(layout: ViewLayout, desktop: string, tablet = "grid-cols-2") {
  if (layout === "desktop") return desktop;
  if (layout === "tablet") return tablet;
  return undefined;
}

/** 섹션 제목. md: 는 모니터 폭이라 편집 모바일 틀에서 공개 화면보다 커진다. */
function sectionTitleClass(layout: ViewLayout) {
  return cn(
    "mt-2 font-medium whitespace-pre-wrap break-keep",
    layout === "mobile" ? "text-2xl" : "text-3xl",
  );
}

/** 편집용 제거. 흰 뱃지 대신 캔버스에 녹는 고스트 ×. */
function EditRemoveX({ onClick, className }: { onClick: () => void; className?: string }) {
  const chrome = useEditorChrome();
  return (
    <button
      type="button"
      className={cn("pf-edit-x", className)}
      aria-label={chromeText(chrome, "editRemove", "삭제")}
      onClick={onClick}
    >
      ×
    </button>
  );
}

function PackIcon({ icon, size = 46 }: { icon: string; size?: number }) {
  const id = resolvePremiumIcon(icon);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={premiumIconSrc(id)} alt="" width={size} height={size} className="h-full w-full object-contain" draggable={false} />
  );
}

function IconPickerModal({
  eyebrow,
  value,
  onPick,
  onClose,
}: {
  eyebrow: string;
  value: string;
  onPick: (id: PremiumIcon) => void;
  onClose: () => void;
}) {
  const chrome = useEditorChrome();
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = resolvePremiumIcon(value);
  useDialogFocusTrap({ open: true, panelRef, onEscape: onClose });
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-label={chromeText(chrome, "shellClose", "닫기")} onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="icon-picker-title"
        className="relative z-[1] w-full max-w-[34rem] rounded-[16px] border border-border bg-surface p-6 pt-7 shadow-[0_28px_60px_rgba(0,0,0,0.45)]"
      >
        <button
          type="button"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-lg leading-none text-text-muted hover:bg-white/10 hover:text-text-primary"
          aria-label={chromeText(chrome, "shellClose", "닫기")}
          onClick={onClose}
        >
          ×
        </button>
        <div className="pr-10">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-text-muted">{eyebrow}</p>
          <h3 id="icon-picker-title" className="mt-1 text-[22px] font-bold tracking-tight text-text-primary">
            {chromeText(chrome, "shellIconPickTitle", "아이콘 선택")}
          </h3>
          <p className="mt-1.5 text-sm text-text-body">{chromeText(chrome, "shellIconPickHint", "카드에 표시할 아이콘을 선택하세요.")}</p>
        </div>
        <div className="mt-5 grid max-h-[min(60vh,28rem)] grid-cols-3 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-4">
          {PREMIUM_ICON_DEFS.map((option) => {
            const active = option.id === selected;
            return (
              <button
                key={option.id}
                type="button"
                className={cn(
                  "flex flex-col items-center gap-2 rounded-[12px] border px-2 py-3 text-center transition-colors",
                  active
                    ? "border-primary bg-primary-soft text-primary-soft-foreground"
                    : "border-border bg-white/5 text-text-body hover:border-primary/40 hover:bg-primary-soft/40",
                )}
                onClick={() => {
                  onPick(option.id);
                  onClose();
                }}
              >
                <span className="inline-flex h-12 w-12 items-center justify-center">
                  <PackIcon icon={option.id} />
                </span>
                <span className="text-[11px] font-semibold leading-snug text-text-primary">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function heroObjectPosition(value: unknown) {
  const raw = String(value ?? "").trim();
  if (raw === "top" || raw === "bottom" || raw === "left" || raw === "right" || raw === "center") return raw;
  return "center";
}

function httpUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return "";
}

function externalFormUrl(snapshot: PageSnapshot) {
  const form = leadFormSection(snapshot);
  return httpUrl(String(form?.content.externalRegisterUrl ?? ""));
}

function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:${digits}` : "";
}

function SectionEyebrow({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const fallback = sectionEyebrowText(chrome, section.sectionType);
  const custom = String(section.content.eyebrow ?? "").trim();
  const shown = custom || fallback;
  if (!shown) return null;
  return (
    <p className="text-sm font-semibold text-primary">
      <InlineText
        value={shown}
        placeholder={chromeText(chrome, "phEyebrow", "작은 제목")}
        onCommit={edit ? (value) => edit.patch(section.id, { ...section.content, eyebrow: value.trim() === fallback ? "" : value }) : undefined}
      />
    </p>
  );
}

function textCommit(section: PageSection, key: string, edit: CanvasEdit | null) {
  if (!edit) return undefined;
  return (value: string) => edit.patch(section.id, { ...section.content, [key]: value });
}

function BoldCopy({
  value,
  placeholder,
  multiline,
  onCommit,
  className,
  hint,
}: {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onCommit?: (value: string) => void;
  className?: string;
  hint?: boolean;
}) {
  const chrome = useEditorChrome();
  return (
    <>
      {onCommit ? <InlineText value={value} placeholder={placeholder} multiline={multiline} onCommit={onCommit} className={className} /> : <MarkedText text={value} />}
      {hint && onCommit ? <span className="mt-1 block text-xs font-normal text-text-muted">{chromeText(chrome, "hintBold", "**이렇게** 감싸면 공개 페이지에서 굵게 보입니다.")}</span> : null}
    </>
  );
}

function imageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("IMAGE_READ"));
    };
    image.src = url;
  });
}

function SiteLogo({ snapshot, live = false }: { snapshot: PageSnapshot; live?: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const [hint, setHint] = useState("");
  const customLogo = String(snapshot.globalSettings.logoUrl ?? "").trim();
  // 편집·미리보기: 미업로드여도 샘플 임시 로고(50×50). 공개(live)는 커스텀만.
  const logoUrl = customLogo || (live && !edit ? "" : SAMPLE_LOGO_URL);
  const needsReplace = Boolean(edit) && isDefaultSampleLogo(customLogo);
  async function upload(file: File) {
    if (!edit) return;
    const size = await imageSize(file).catch(() => null);
    if (!size) {
      setHint(chromeText(chrome, "mediaImageReadFail", "이미지를 읽지 못했습니다."));
      return;
    }
    if (size.width !== 50 || size.height !== 50) {
      setHint(chromeText(chrome, "mediaLogoSize", "50×50 사이즈 이미지를 사용해 주세요."));
      return;
    }
    setHint("");
    await edit.upload(file).then((url) => edit.setLogo(url));
  }
  if (!logoUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element
  const logoImage = (
    <img
      src={logoUrl}
      alt=""
      width={50}
      height={50}
      className="h-[50px] w-[50px] rounded-[10px] border border-border bg-white object-contain"
    />
  );
  if (!edit) {
    if (!live) return logoImage;
    return (
      <a href="#hero" aria-label={snapshot.projectName} className="shrink-0">
        {logoImage}
      </a>
    );
  }
  const callout = hint || chromeText(chrome, "mediaLogoHint", "50×50 이미지로 교체해 주세요");
  return (
    <span className="relative inline-flex shrink-0" data-site-logo>
      <label
        className="relative flex h-[50px] w-[50px] cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-border bg-white"
        title={chromeText(chrome, "ariaLogoChange", "로고 바꾸기")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" width={50} height={50} className="h-full w-full object-contain" />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void upload(file).catch(() => setHint(chromeText(chrome, "mediaLogoFail", "로고를 올리지 못했습니다.")));
          }}
        />
      </label>
      {needsReplace || hint ? (
        <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-40 -translate-x-1/2">
          <span
            role="status"
            className="pf-logo-hint relative block whitespace-nowrap rounded-[8px] bg-text-primary px-2.5 py-1 text-[12px] font-semibold leading-none text-white"
          >
            <span className="absolute left-1/2 top-[-3px] h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-text-primary" aria-hidden />
            {callout}
          </span>
        </span>
      ) : null}
    </span>
  );
}

function useActiveAnchor(pageRef: { current: HTMLElement | null }, sections: PageSection[]) {
  const items = sections.filter((section) => section.sectionType !== "legal");
  const key = items.map((section) => section.anchorId).join("|");
  const [active, setActive] = useState(items[0]?.anchorId ?? "");
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const root = page.closest("[data-preview-scroll]");
    const nodes = itemsRef.current
      .map((section) => page.querySelector(`[id="${CSS.escape(section.anchorId)}"]`))
      .filter((node): node is Element => Boolean(node));
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit?.target.id) setActive(hit.target.id);
      },
      { root: root instanceof HTMLElement ? root : null, rootMargin: "-20% 0px -55% 0px", threshold: [0.15, 0.4, 0.6] },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [key, pageRef]);
  return active;
}

function SectionScrollNav({ sections, narrow, active }: { sections: PageSection[]; narrow: boolean; active: string }) {
  const chrome = useEditorChrome();
  const items = sections.filter((section) => section.sectionType !== "legal");
  if (narrow || items.length < 2) return null;
  return (
    <nav aria-label={chromeText(chrome, "ariaSectionNav", "섹션 바로가기")} className="pointer-events-none sticky top-1/2 z-30 hidden h-0 lg:block">
      <ol className="pointer-events-auto absolute left-3 flex -translate-y-1/2 flex-col gap-3">
        {items.map((section) => {
          const on = active === section.anchorId;
          return (
            <li key={section.anchorId}>
              <button
                type="button"
                aria-current={on ? "true" : undefined}
                className="group flex items-center gap-2"
                onClick={(event) => scrollToAnchor(section.anchorId, event.currentTarget)}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full border", on ? "border-primary bg-primary" : "border-border bg-white")} />
                <span className={cn("max-w-28 truncate text-xs font-semibold", on ? "text-primary" : "text-text-muted group-hover:text-text-primary")}>
                  {section.gnbLabel || section.title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SharePage({ snapshot, live }: { snapshot: PageSnapshot; live: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const [copied, setCopied] = useState<"ok" | "fail" | "">("");
  const label = String(snapshot.globalSettings.shareLabel ?? "");
  async function share() {
    const url = live ? window.location.href : `${window.location.origin}/${snapshot.publicSlug}`;
    if (live && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: snapshot.projectName, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    window.setTimeout(() => setCopied(""), 1500);
  }
  return (
    <button
      type="button"
      className="inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
        void share();
      }}
    >
      {copied === "ok" ? copyFlash(snapshot.globalSettings, "ok") : copied === "fail" ? copyFlash(snapshot.globalSettings, "fail") : edit ? (
        <InlineText value={label} placeholder={chromeText(chrome, "phShare", "공유")} onCommit={edit.setShareLabel} />
      ) : (
        label.trim() || chromeText(chrome, "phShare", "공유")
      )}
    </button>
  );
}

function copyFlash(settings: Record<string, unknown>, state: "ok" | "fail") {
  if (state === "ok") return chromeText(settings, "copyOkLabel", "주소를 복사했습니다");
  return chromeText(settings, "copyFailLabel", "복사하지 못했습니다");
}

function scrollToAnchor(anchorId: string, from?: Element | null) {
  const scroller = from?.closest("[data-preview-scroll]");
  const node =
    (scroller?.querySelector(`[id="${anchorId}"]`) as HTMLElement | null) ??
    document.getElementById(anchorId);
  const frame = node?.closest("[data-preview-scroll]");
  const root = node?.closest(".presale-foreon, .midday-landing");
  const header = root?.querySelector("[data-site-header]");
  const headerH = header instanceof HTMLElement ? header.offsetHeight : 72;
  if (node && frame instanceof HTMLElement) {
    const top = node.getBoundingClientRect().top - frame.getBoundingClientRect().top + frame.scrollTop - headerH - 12;
    frame.scrollTo({ top, behavior: "smooth" });
    return;
  }
  node?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionMenu({
  gnb,
  live,
  slug,
  forceOpen,
  active,
}: {
  gnb: Array<{ label: string; href: string; anchorId: string }>;
  live: boolean;
  slug: string;
  forceOpen: boolean;
  active: string;
}) {
  const chrome = useEditorChrome();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);
  return (
    <div ref={rootRef} className={forceOpen ? "relative" : "relative lg:hidden"}>
      <button type="button" className="inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {chromeText(chrome, "phMenu", "메뉴")}
      </button>
      {open ? (
        <div className="absolute right-0 top-14 z-30 min-w-44 rounded-[16px] border border-border bg-white p-2">
          {gnb.map((item) =>
            live ? (
              <TrackedLink
                key={item.anchorId}
                href={item.href}
                slug={slug}
                eventName="gnb_click"
                metadata={{ section: item.anchorId }}
                className={cn("block rounded-[14px] px-3 py-3 text-sm", active === item.anchorId ? "font-semibold text-primary" : "text-text-body hover:bg-surface")}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </TrackedLink>
            ) : (
              <a
                key={item.anchorId}
                href={item.href}
                className={cn("block rounded-[14px] px-3 py-3 text-sm", active === item.anchorId ? "font-semibold text-primary" : "text-text-body hover:bg-surface")}
                onClick={(event) => {
                  event.preventDefault();
                  setOpen(false);
                  scrollToAnchor(item.anchorId, event.currentTarget);
                }}
              >
                {item.label}
              </a>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

function HeroPicture({
  imageUrl,
  className,
  alt,
  objectPosition,
  priority = false,
}: {
  imageUrl: string;
  className: string;
  alt: string;
  objectPosition?: string;
  priority?: boolean;
}) {
  if (!imageUrl) return null;
  const style = { objectPosition: heroObjectPosition(objectPosition) };
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      style={style}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  );
}

/**
 * 편집 중 이미지 영역을 누르면 바로 파일 선택이 열린다. 마우스를 올리면 「이미지 변경」 표시가 뜬다.
 * 공개·미리보기에서는 평범한 img로 그린다.
 */
function EditableImage({
  src,
  alt,
  className,
  imageClassName,
  emptyClassName,
  emptyLabel,
  onUpload,
}: {
  src?: string;
  alt: string;
  className?: string;
  imageClassName: string;
  /** 이미지가 없을 때 점선 칸에 줄 크기·모양 클래스 */
  emptyClassName?: string;
  /** 이미지가 없을 때 칸 안에 보일 문구(편집 가능한 노드도 가능) */
  emptyLabel?: ReactNode;
  onUpload: (url: string) => void;
}) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const [uploading, setUploading] = useState(false);
  if (!edit) {
    if (!src) return null;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={cn(imageClassName, className)} loading="lazy" decoding="async" />;
  }
  const changeLabel = chromeText(chrome, "mediaImageChange", "이미지 변경");
  return (
    <label
      className={cn("pf-img-edit relative block", !src && "pf-img-empty", !src && emptyClassName, className)}
      title={changeLabel}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("[role='textbox']")) event.preventDefault();
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className={imageClassName} loading="lazy" decoding="async" />
      ) : (
        <span className="pf-img-empty-body">
          <span aria-hidden className="pf-img-empty-plus">+</span>
          <span>{emptyLabel ?? chromeText(chrome, "phImageEmpty", "이미지")}</span>
        </span>
      )}
      {src ? <span className="pf-img-edit-badge">{changeLabel}</span> : <span className="pf-img-edit-badge pf-img-edit-badge-empty">{changeLabel}</span>}
      {uploading ? <span className="pf-img-uploading" role="status">{chromeText(chrome, "mediaUploading", "업로드 중…")}</span> : null}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setUploading(true);
          void edit
            .upload(file)
            .then((url) => {
              if (url) onUpload(url);
            })
            .catch(() => undefined)
            .finally(() => setUploading(false));
        }}
      />
    </label>
  );
}

const ViewerLabelsContext = createContext({ prev: "", next: "", close: "" });

/** HTML 시안처럼 배경 띠를 두는 섹션 */
const BAND_SECTIONS = new Set(["location", "floorplan", "faq", "directions"]);

export function LandingPage({
  snapshot,
  mode = "live",
  variant = "desktop",
  highlightId = null,
  edit = null,
  showPopup = false,
  onClosePopup,
  onReturnToSettings,
  onActiveAnchor,
  onSelectSection,
  onMiddayDataChange,
  middayProjectId = null,
  onOakDataChange,
  onOakSectionsChange,
}: {
  snapshot: PageSnapshot;
  mode?: "live" | "preview";
  /** 편집기에서 선택한 섹션 id. 캔버스에 선택 표시를 그린다. */
  highlightId?: string | null;
  variant?: "desktop" | "tablet" | "mobile";
  edit?: CanvasEdit | null;
  showPopup?: boolean;
  onClosePopup?: () => void;
  /** 설정 화면에서 연 팝업 미리보기일 때만 넘긴다. 「설정으로 돌아가기」 버튼이 생긴다. */
  onReturnToSettings?: () => void;
  onActiveAnchor?: (anchorId: string) => void;
  onSelectSection?: (sectionId: string) => void;
  /** midday 원본 템플릿: 인라인 편집 데이터 저장 */
  onMiddayDataChange?: (data: PresaleLandingData) => void;
  /** midday 업로드용 프로젝트 id */
  middayProjectId?: string | null;
  /** oak-editorial 인라인 편집 */
  onOakDataChange?: (data: OakEditorialData) => void;
  onOakSectionsChange?: (sections: PageSection[]) => void;
}) {
  // 모든 훅은 템플릿 early return보다 앞에 둔다. (foreon↔oak/midday 전환 시 Rules of Hooks)
  const viewportPhone = useMediaQuery("(max-width:767px)");
  const viewportTablet = useMediaQuery("(min-width:768px) and (max-width:1023px)");
  const pageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const isOriginTemplate = snapshot.templateCode === "midday" || snapshot.templateCode === "info";
  const isOakTemplate = snapshot.templateCode === "oak-editorial";
  const isForeon = !isOriginTemplate && !isOakTemplate;

  // 공개·미리보기는 FAQ·gallery를 clamp한 뒤 보이는 것만. 편집 캔버스는 레거시 행을 목록에 두되(패널 편집), 가시성·GNB는 draft/persist clamp로 끈다.
  const sections = isForeon
    ? edit
      ? [...snapshot.sections].sort((a, b) => a.sortOrder - b.sortOrder)
      : visible(snapshot.sections.map(clampLaunchExcludedSection))
    : [];
  const hero = sections.find((section) => section.sectionType === "hero");
  const activeAnchor = useActiveAnchor(pageRef, sections);
  useEffect(() => {
    if (!isForeon) return;
    if (activeAnchor) onActiveAnchor?.(activeAnchor);
  }, [activeAnchor, onActiveAnchor, isForeon]);
  // 고정 헤더의 실제 높이를 CSS 변수로 알려 히어로 무대·앵커 이동이 헤더에 가리지 않게 한다.
  useEffect(() => {
    if (!isForeon) return;
    const page = pageRef.current;
    const header = page?.querySelector(":scope > header");
    if (!page || !(header instanceof HTMLElement)) return;
    const sync = () => page.style.setProperty("--pf-header-h", `${header.offsetHeight}px`);
    sync();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isForeon]);
  // 스크롤 등장 효과: 히어로를 제외한 섹션이 화면에 들어오면 아래에서 부드럽게 떠오른다. 편집·모션 최소화에서는 쓰지 않는다.
  const revealKey = sections.map((section) => section.id).join("|");
  useEffect(() => {
    if (!isForeon) return;
    const page = pageRef.current;
    if (!page || edit || reducedMotion || typeof IntersectionObserver === "undefined") return;
    const targets = Array.from(page.querySelectorAll<HTMLElement>(":scope > section[id]")).filter((node) => node.id !== (hero?.anchorId ?? "hero"));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = "in";
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -6% 0px" },
    );
    for (const node of targets) {
      node.dataset.reveal = "pending";
      observer.observe(node);
    }
    return () => {
      observer.disconnect();
      for (const node of targets) delete node.dataset.reveal;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit, reducedMotion, revealKey, isForeon]);

  // 직방 LUMIÈRE 원본 렌더러 — midday + info(구 애드잇 시안) 모두 동일 원본 뷰 사용
  // info를 섹션 재구성으로 그리면 레이아웃·인터랙션이 원본과 달라진다.
  if (isOriginTemplate) {
    const previewDevice =
      variant === "mobile" ? "mobile" : variant === "tablet" ? "tablet" : "desktop";
    return (
      <MiddayOriginHost
        snapshot={snapshot}
        editMode={Boolean(edit)}
        projectId={middayProjectId ?? null}
        leadLive={mode === "live"}
        onChange={onMiddayDataChange}
        previewDevice={previewDevice}
        forcePopup={showPopup}
        onClosePopup={onClosePopup}
      />
    );
  }

  if (isOakTemplate) {
    const previewDevice =
      mode === "preview" ? (variant === "mobile" ? "mobile" : variant === "tablet" ? "tablet" : "desktop") : "desktop";
    return (
      <OakOriginHost
        snapshot={snapshot}
        editMode={Boolean(edit)}
        projectId={middayProjectId ?? null}
        leadLive={mode === "live"}
        previewDevice={previewDevice}
        onChange={onOakDataChange}
        onSectionsChange={onOakSectionsChange}
      />
    );
  }

  const navSections = sections.filter((section) => section.isVisible);
  // 질문·답변이 모두 비어 있는 FAQ는 공개 화면에 내지 않는다(편집 중에는 보인다).
  const emptyFaqAnchors = new Set(
    edit
      ? []
      : sections
          .filter((section) => section.sectionType === "faq" && !faqItems(section.content.items).some((item) => item.question.trim() && item.answer.trim()))
          .map((section) => section.anchorId),
  );
  const gnbSource = edit ? snapshot.sections : snapshot.sections.map(clampLaunchExcludedSection);
  const gnb = gnbItemsFromSections(gnbSource).filter((item) => !emptyFaqAnchors.has(item.anchorId));
  const live = mode === "live";
  const slug = snapshot.publicSlug;
  // midday/info/oak는 위에서 early return. 여기부터는 foreon(분양 현장형)만.
  const isMidday = false;
  // 공개 화면은 실제 창 너비로도 좁은 화면 배치를 쓴다. 편집·미리보기 캔버스는 선택한 기기 폭(variant)만 따른다.
  const layout: ViewLayout =
    variant === "mobile" || (live && variant === "desktop" && viewportPhone)
      ? "mobile"
      : variant === "tablet" || (live && variant === "desktop" && viewportTablet)
        ? "tablet"
        : "desktop";
  const narrow = layout !== "desktop";
  const phone = layout === "mobile";
  const editorChrome = Object.fromEntries(
    Object.entries(snapshot.globalSettings).map(([key, value]) => [key, value == null ? "" : String(value)]),
  );
  const cta =
    String(hero?.content.ctaLabel ?? snapshot.globalSettings.ctaLabel ?? "").trim() ||
    chromeText(editorChrome, "phCta", "관심고객 등록");
  const formUrl = externalFormUrl(snapshot);
  const inquiryAnchor = leadInquiryAnchor(snapshot);
  const inquiryHref = `#${inquiryAnchor}`;
  const viewerLabels = {
    prev: String(snapshot.globalSettings.viewerPrev ?? ""),
    next: String(snapshot.globalSettings.viewerNext ?? ""),
    close: String(snapshot.globalSettings.viewerClose ?? ""),
  };
  return (
    <CanvasEditContext.Provider value={edit}>
    <EditorChromeContext.Provider value={editorChrome}>
    <ViewerLabelsContext.Provider value={viewerLabels}>
    <div
      ref={pageRef}
      data-editing={edit ? "" : undefined}
      data-template={snapshot.templateCode}
      data-narrow={narrow ? "true" : undefined}
      className={cn(
        isMidday ? "midday-landing" : "presale-foreon",
        isMidday && variant === "tablet" && "presale-preview-device--tablet",
        isMidday && variant === "mobile" && "presale-preview-device--mobile",
        !isMidday && variant === "mobile" && "text-[15px]",
        edit && isMidday && "midday-edit-mode",
      )}
    >
      <header
        data-site-header
        className={cn(
          isMidday
            ? cn("lc-gnb", edit && "relative")
            : cn("z-20 border-b border-border/80 bg-white/90 backdrop-blur", edit ? "relative" : "sticky top-0"),
        )}
      >
        <div
          className={cn(
            isMidday
              ? "lc-gnb__inner"
              : cn("mx-auto flex max-w-6xl items-center justify-between px-4", narrow ? "gap-2 py-2" : "gap-4 py-3"),
          )}
        >
          <div className={cn("flex min-w-0 items-center", isMidday ? "gap-3" : narrow ? "gap-2" : "gap-3")}>
            <SiteLogo snapshot={snapshot} live={live} />
            <div className="min-w-0">
              <a
                href="#hero"
                className={cn("block min-w-0 font-semibold", phone ? "leading-tight" : "truncate")}
                onClick={(event) => edit && event.preventDefault()}
              >
                <InlineText
                  className={cn("block", phone ? "line-clamp-2 whitespace-normal break-keep" : "truncate whitespace-nowrap")}
                  value={snapshot.projectName}
                  onCommit={edit ? edit.setSiteName : undefined}
                  placeholder={chromeText(editorChrome, "phSite", "현장명")}
                />
              </a>
              {/* midday GNB는 스펙상 로고+현장명만. 보조 문구는 공간·정렬을 해쳐 숨긴다. */}
              {!isMidday && (edit || (!narrow && String(snapshot.globalSettings.navSubtitle ?? "").trim())) ? (
                <p className="truncate text-xs text-text-muted">
                  <InlineText
                    value={String(snapshot.globalSettings.navSubtitle ?? "")}
                    placeholder={chromeText(editorChrome, "phNavSubtitle", "상단 보조 문구")}
                    onCommit={edit?.setNavSubtitle}
                  />
                </p>
              ) : null}
            </div>
          </div>
          {isMidday ? (
            <div className="lc-gnb__end">
              {!narrow ? (
                <nav className="lc-gnb__nav lc-gnb__nav--desktop" aria-label="섹션">
                  {gnb.map((item) =>
                    live ? (
                      <TrackedLink
                        key={item.anchorId}
                        href={item.href}
                        slug={slug}
                        eventName="gnb_click"
                        metadata={{ section: item.anchorId }}
                        className={activeAnchor === item.anchorId ? "is-active" : undefined}
                      >
                        {item.label}
                      </TrackedLink>
                    ) : (
                      <a
                        key={item.anchorId}
                        href={item.href}
                        className={activeAnchor === item.anchorId ? "is-active" : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          scrollToAnchor(item.anchorId, event.currentTarget);
                        }}
                      >
                        {item.label}
                      </a>
                    ),
                  )}
                </nav>
              ) : null}
              <div className="lc-gnb__actions">
                {narrow ? <SectionMenu gnb={gnb} live={live} slug={slug} forceOpen active={activeAnchor} /> : null}
                {(edit || snapshot.phone) && !narrow ? (
                  <span className="lc-gnb__phone">
                    <small className="lc-gnb__phone-label">
                      {edit && hero ? (
                        <InlineText
                          value={String(hero.content.headerPhoneLabel ?? "")}
                          placeholder={chromeText(editorChrome, "phPhoneCaption", "문의번호")}
                          onCommit={(value) => edit.patch(hero.id, { ...hero.content, headerPhoneLabel: value })}
                        />
                      ) : (
                        String(hero?.content.headerPhoneLabel ?? "").trim() || chromeText(editorChrome, "phPhoneCaption", "문의번호")
                      )}
                    </small>
                    {edit ? (
                      <InlineText value={snapshot.phone} placeholder={chromeText(editorChrome, "phPhoneMain", "대표 전화")} onCommit={edit.setPhone} />
                    ) : live && phoneHref(snapshot.phone) ? (
                      <a href={phoneHref(snapshot.phone)}>{snapshot.phone}</a>
                    ) : (
                      snapshot.phone
                    )}
                  </span>
                ) : null}
                {live ? (
                  <TrackedLink href={formUrl || inquiryHref} target={formUrl ? "_blank" : undefined} slug={slug} eventName="lead_cta_click" className="lc-gnb__cta lc-gnb__cta--fill">
                    {cta}
                    <span className="lc-gnb__cta-arrow" aria-hidden>
                      ↗
                    </span>
                  </TrackedLink>
                ) : (
                  <a
                    href={inquiryHref}
                    className="lc-gnb__cta lc-gnb__cta--fill"
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToAnchor(inquiryAnchor, event.currentTarget);
                    }}
                  >
                    {cta}
                    <span className="lc-gnb__cta-arrow" aria-hidden>
                      ↗
                    </span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <>
              <nav className={narrow ? "hidden" : "hidden gap-4 lg:flex"}>
                {gnb.map((item) =>
                  live ? (
                    <TrackedLink
                      key={item.anchorId}
                      href={item.href}
                      slug={slug}
                      eventName="gnb_click"
                      metadata={{ section: item.anchorId }}
                      className={cn("text-sm", activeAnchor === item.anchorId ? "font-semibold text-primary" : "text-text-body hover:text-text-primary")}
                    >
                      {item.label}
                    </TrackedLink>
                  ) : (
                    <a
                      key={item.anchorId}
                      href={item.href}
                      className={cn("text-sm", activeAnchor === item.anchorId ? "font-semibold text-primary" : "text-text-body hover:text-text-primary")}
                      onClick={(event) => {
                        event.preventDefault();
                        scrollToAnchor(item.anchorId, event.currentTarget);
                      }}
                    >
                      {item.label}
                    </a>
                  ),
                )}
              </nav>
              <div className={cn("flex shrink-0 items-center", narrow ? "gap-2" : "gap-3")}>
                <SectionMenu gnb={gnb} live={live} slug={slug} forceOpen={narrow} active={activeAnchor} />
                {(edit || snapshot.phone) && !narrow ? (
                  <div className="text-right leading-tight">
                    <p className="text-xs text-text-muted">
                      {edit && hero ? (
                        <InlineText
                          value={String(hero.content.headerPhoneLabel ?? "")}
                          placeholder={chromeText(editorChrome, "phPhoneCaption", "문의번호")}
                          onCommit={(value) => edit.patch(hero.id, { ...hero.content, headerPhoneLabel: value })}
                        />
                      ) : (
                        String(hero?.content.headerPhoneLabel ?? "").trim() || chromeText(editorChrome, "phPhoneCaption", "문의번호")
                      )}
                    </p>
                    {edit ? (
                      <p className="text-sm font-semibold">
                        <InlineText
                          value={snapshot.phone}
                          placeholder={chromeText(editorChrome, "phPhoneMain", "대표 전화")}
                          onCommit={edit.setPhone}
                        />
                      </p>
                    ) : live && phoneHref(snapshot.phone) ? (
                      <a href={phoneHref(snapshot.phone)} className="text-sm font-semibold">{snapshot.phone}</a>
                    ) : (
                      <p className="text-sm font-semibold">{snapshot.phone}</p>
                    )}
                  </div>
                ) : null}
                {live && !phone ? (
                  <span className={narrow ? "hidden sm:contents" : "contents"}>
                    <SharePage snapshot={snapshot} live={live} />
                  </span>
                ) : null}
                {live ? (
                  <TrackedLink href={formUrl || inquiryHref} target={formUrl ? "_blank" : undefined} slug={slug} eventName="lead_cta_click" className={cn("inline-flex h-12 max-w-[9.5rem] items-center truncate rounded-[14px] bg-primary font-semibold text-white sm:max-w-none", phone ? "px-3 text-sm" : narrow ? "px-4 text-sm" : "px-5 text-[17px]")}>
                    {cta}
                  </TrackedLink>
                ) : (
                  <a
                    href={inquiryHref}
                    className={cn("inline-flex h-12 max-w-[9.5rem] items-center truncate rounded-[14px] bg-primary font-semibold text-white sm:max-w-none", phone ? "px-3 text-sm" : narrow ? "px-4 text-sm" : "px-5 text-[17px]")}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToAnchor(inquiryAnchor, event.currentTarget);
                    }}
                  >
                    {cta}
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </header>
      {/* 스크롤 따라다니는 문의 바. sticky는 문서 앞쪽에 있어야 뷰포트 하단에 붙는다. midday 편집 중에는 히어로 CTA와 겹쳐 숨긴다. */}
      {isMidday && edit ? null : <ContactDock snapshot={snapshot} live={live} compact={narrow} />}
      {live ? <SectionScrollNav sections={navSections.filter((section) => !emptyFaqAnchors.has(section.anchorId))} narrow={narrow} active={activeAnchor} /> : null}
      {sections.map((section) => {
        if (emptyFaqAnchors.has(section.anchorId)) return null;
        // 출시 제외: 공개·미리보기에서는 FAQ·독립 gallery를 내지 않는다. 편집 캔버스만 레거시 유지.
        const launchExcluded = isLaunchExcludedSectionType(section.sectionType);
        if (launchExcluded && !edit) return null;
        const inner = (
          <>
            {!section.isVisible ? (
              <p className="bg-surface px-4 py-2 text-center text-xs font-semibold text-text-muted">{chromeText(editorChrome, "hintHidden", "숨긴 섹션입니다. 공개 페이지와 미리보기에는 나오지 않습니다.")}</p>
            ) : null}
            {section.sectionType === "hero" ? <Hero section={section} snapshot={snapshot} live={live} narrow={narrow} phone={phone} /> : null}
            {section.sectionType === "overview" ? <Overview section={section} layout={layout} /> : null}
            {section.sectionType === "location" ? <Cards section={section} layout={layout} /> : null}
            {section.sectionType === "premium" ? <Premium section={section} layout={layout} /> : null}
            {section.sectionType === "gallery" ? <Gallery section={section} /> : null}
            {section.sectionType === "faq" ? <Faq section={section} layout={layout} /> : null}
            {section.sectionType === "floorplan" ? <Floorplan section={section} layout={layout} /> : null}
            {section.sectionType === "directions" ? <Directions section={section} sitePhone={snapshot.phone} layout={layout} snapshot={snapshot} /> : null}
            {section.sectionType === "lead_form" ? (
              <LeadForm snapshot={snapshot} section={section} disabled={mode === "preview"} narrow={narrow} twoColumn={layout !== "mobile"} />
            ) : null}
            {section.sectionType === "legal" ? <Legal section={section} snapshot={snapshot} live={live} /> : null}
          </>
        );
        const selected = Boolean(edit && highlightId && highlightId === section.id);
        const className = cn(
          BAND_SECTIONS.has(section.sectionType) && "pf-band",
          !section.isVisible && "opacity-60",
          selected && "relative z-[1] ring-2 ring-inset ring-primary/70",
        );
        const selectSection = edit
          ? (event: MouseEvent<HTMLElement>) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest("button, a, input, textarea, select, [contenteditable='true'], label")) return;
              onSelectSection?.(section.id);
            }
          : undefined;
        return live ? (
          <TrackedSection key={section.id} slug={slug} name={section.sectionType} id={section.anchorId} className={className}>
            {inner}
          </TrackedSection>
        ) : (
          <section
            key={section.id}
            id={section.anchorId}
            data-section-id={section.id}
            data-selected={selected ? "" : undefined}
            className={className}
            onClick={selectSection}
          >
            {inner}
          </section>
        );
      })}
      {live && isPopupEnabled(snapshot.globalSettings.popup as { enabled?: boolean } | undefined) ? <VisitPopup snapshot={snapshot} live layout={layout} /> : null}
      {showPopup ? <VisitPopup snapshot={snapshot} layout={layout} forced onClose={onClosePopup} onReturnToSettings={onReturnToSettings} /> : null}
    </div>
    </ViewerLabelsContext.Provider>
    </EditorChromeContext.Provider>
    </CanvasEditContext.Provider>
  );
}

function HeroRegion({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const firstStored = String(section.content.region1 ?? "");
  const second = String(section.content.region2 ?? "");
  const legacy = !firstStored.trim() && !second.trim() ? String(section.content.region ?? "") : "";
  const first = firstStored || legacy;
  const shown = [first.trim(), second.trim()].filter(Boolean).join(" · ");
  if (!edit && !shown) return null;
  function commit(key: "region1" | "region2", value: string) {
    edit?.patch(section.id, {
      ...section.content,
      region: "",
      region1: key === "region1" ? value : firstStored || legacy,
      region2: key === "region2" ? value : second,
    });
  }
  if (!edit) return <p className="pf-region">{shown}</p>;
  return (
    <p className="pf-region pf-region-edit">
      <InlineText value={first} placeholder={chromeText(chrome, "phRegion1", SAMPLE_SITE.region1)} className="pf-region-part" onCommit={(value) => commit("region1", value)} />
      <span className="pf-region-sep" aria-hidden>
        ·
      </span>
      <InlineText value={second} placeholder={chromeText(chrome, "phRegion2", SAMPLE_SITE.region2)} className="pf-region-part" onCommit={(value) => commit("region2", value)} />
    </p>
  );
}

function HeroPhone({ section, snapshot, live }: { section: PageSection; snapshot: PageSnapshot; live: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const label = String(section.content.phoneLabel ?? "");
  const phone = snapshot.phone;
  const href = phoneHref(phone);
  if (!edit && !label.trim() && !phone.trim()) return null;
  const body = (
    <>
      {edit || label.trim() ? (
        <InlineText value={label} placeholder={chromeText(chrome, "phPhoneAsk", "전화 문의")} onCommit={textCommit(section, "phoneLabel", edit)} />
      ) : null}
      {edit || phone.trim() ? (
        <InlineText value={phone} placeholder={chromeText(chrome, "phPhoneMain", "대표 전화")} onCommit={edit?.setPhone} />
      ) : null}
    </>
  );
  if (!edit && live && href) {
    return (
      <TrackedLink href={href} slug={snapshot.publicSlug} eventName="phone_click" className="inline-flex h-12 items-center gap-2 rounded-[14px] border border-border px-5 text-[17px] font-semibold">
        {label.trim() ? <span>{label.trim()}</span> : null}
        <span>{phone}</span>
      </TrackedLink>
    );
  }
  return (
    <span className="inline-flex h-12 items-center gap-2 rounded-[14px] border border-border px-5 text-[17px] font-semibold">
      {body}
    </span>
  );
}

function findScrollParent(node: HTMLElement): HTMLElement | null {
  const marked = node.closest("[data-preview-scroll]");
  if (marked instanceof HTMLElement) return marked;
  let parent = node.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const overflowY = window.getComputedStyle(parent).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return null;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
/** 0과 1 끝을 완만하게 잇는다. 스크롤 시작·끝에서 속도가 튀지 않게 쓴다. */
const smoothstep = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
/** 히어로 이미지 최대 확대 배율. 좁은 화면은 증가량의 55%만 쓴다. */
const HERO_ZOOM_MAX = 1.12;

/**
 * 스크롤 연동 히어로 확대. 스크롤 입력은 가로채지 않고(passive), rAF 안에서 CSS 변수만 바꾼다.
 * React state는 쓰지 않아 프레임마다 트리가 다시 그려지지 않는다.
 */
function useHeroZoom({
  trackRef,
  stageRef,
  copyRef,
  enabled,
  narrow,
}: {
  trackRef: { current: HTMLDivElement | null };
  stageRef: { current: HTMLDivElement | null };
  copyRef: { current: HTMLDivElement | null };
  enabled: boolean;
  narrow: boolean;
}) {
  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const copy = copyRef.current;
    if (!track || !stage || !copy) return;
    const scroller = findScrollParent(track);
    const target: HTMLElement | Window = scroller ?? window;
    if (scroller) {
      track.style.setProperty("--pf-track-min", "0px");
      track.style.setProperty("--pf-stage-min", "0px");
    }
    let frame = 0;
    let lastViewH = -1;
    function paint() {
      frame = 0;
      if (!track || !stage || !copy) return;
      const rawH = scroller ? scroller.clientHeight : 0;
      const frameKind = track.closest("[data-device-frame]")?.getAttribute("data-device-viewport");
      const frameCap = frameKind === "mobile" ? 844 : frameKind === "tablet" ? 1024 : 0;
      const viewH = frameCap > 0 ? Math.min(frameCap, rawH) : rawH;
      if (scroller && viewH !== lastViewH) {
        lastViewH = viewH;
        track.style.setProperty("--pf-vh", `${viewH}px`);
      }
      if (!enabled) {
        track.style.removeProperty("--pf-zoom");
        track.style.removeProperty("--pf-fade");
        track.style.removeProperty("--pf-shift");
        track.style.removeProperty("--pf-hint");
        track.style.removeProperty("--pf-veil");
        copy.style.visibility = "";
        copy.removeAttribute("inert");
        return;
      }
      const origin = scroller ? scroller.getBoundingClientRect().top : 0;
      const header = track.closest(".presale-foreon, .midday-landing")?.querySelector(":scope > header");
      const headerH = header instanceof HTMLElement ? header.offsetHeight : 0;
      const rect = track.getBoundingClientRect();
      const distance = Math.max(1, track.offsetHeight - stage.offsetHeight);
      const scrollTop = scroller ? scroller.scrollTop : window.scrollY;
      const trackOffset = rect.top - origin + scrollTop;
      // 처음 보이는 장면을 0으로 둔다. 헤더에 가려진 겹침은 진행률에 넣지 않는다.
      const pinStart = Math.max(0, trackOffset - headerH);
      const progress = clamp01((scrollTop - pinStart) / distance);
      const isNarrow = narrow || window.innerWidth < 768;
      const extra = (HERO_ZOOM_MAX - 1) * (isNarrow ? 0.55 : 1);
      // 사진은 구간 내내 천천히 다가온다. 글은 선명하게 두었다가 뒤쪽에서 짧게 걷힌다.
      const zoom = smoothstep(progress / 0.95);
      const leave = smoothstep((progress - 0.22) / 0.38);
      const fade = 1 - leave;
      track.style.setProperty("--pf-zoom", String(1 + extra * zoom));
      track.style.setProperty("--pf-fade", fade.toFixed(3));
      track.style.setProperty("--pf-shift", `${(-18 * leave).toFixed(2)}px`);
      track.style.setProperty("--pf-hint", (1 - smoothstep(progress / 0.18)).toFixed(3));
      track.style.setProperty("--pf-veil", (0.22 * zoom).toFixed(3));
      const hideCopy = fade <= 0.02;
      if (hideCopy && !copy.contains(document.activeElement)) {
        copy.style.visibility = "hidden";
        copy.setAttribute("inert", "");
      } else {
        copy.style.visibility = "";
        copy.removeAttribute("inert");
      }
    }
    function schedule() {
      if (!frame) frame = window.requestAnimationFrame(paint);
    }
    paint();
    if (enabled) target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = scroller && typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (scroller) observer?.observe(scroller);
    const frameEl = track.closest("[data-device-frame]");
    if (frameEl instanceof HTMLElement) observer?.observe(frameEl);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [trackRef, stageRef, copyRef, enabled, narrow]);
}

type HeroTag = { text: string };

function heroTags(value: unknown): HeroTag[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, HERO_TAG_MAX).map((item) => ({ text: String((item as { text?: unknown } | null)?.text ?? "") }));
}

/** 분양가 블록: 라벨 · 타입+메인가 · 보조가 · 유의사항. 편집 중이거나 값이 있을 때만 보인다. */
function HeroPrice({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const content = section.content;
  const label = String(content.priceLabel ?? "");
  const type = String(content.priceType ?? "");
  const main = String(content.priceMain ?? "");
  const sub = String(content.priceSub ?? "");
  const note = String(content.priceNote ?? "");
  const hasValue = [type, main, sub, note].some((value) => value.trim());
  if (!edit && !hasValue) return null;
  const show = (value: string) => Boolean(edit || value.trim());
  return (
    <div className="pf-price">
      {show(label) ? (
        <p className="pf-price-label">
          <InlineText value={label} placeholder={chromeText(chrome, "phPriceLabel", "분양가 라벨")} onCommit={textCommit(section, "priceLabel", edit)} />
        </p>
      ) : null}
      {show(type) || show(main) ? (
        <p className="pf-price-main">
          {show(type) ? (
            <span className="pf-price-type">
              <InlineText value={type} placeholder={chromeText(chrome, "phPriceType", "타입")} onCommit={textCommit(section, "priceType", edit)} />
            </span>
          ) : null}
          {show(main) ? (
            <strong className="pf-price-value">
              <InlineText value={main} placeholder={chromeText(chrome, "phPriceMain", "분양가")} onCommit={textCommit(section, "priceMain", edit)} />
            </strong>
          ) : null}
        </p>
      ) : null}
      {show(sub) ? (
        <p className="pf-price-sub">
          <InlineText value={sub} placeholder={chromeText(chrome, "phPriceSub", "보조 가격")} onCommit={textCommit(section, "priceSub", edit)} />
        </p>
      ) : null}
      {show(note) ? (
        <p className="pf-price-note">
          <InlineText value={note} multiline placeholder={chromeText(chrome, "phPriceNote", "유의사항")} onCommit={textCommit(section, "priceNote", edit)} />
        </p>
      ) : null}
    </div>
  );
}

/** 등록 혜택 한 줄. `**굵게**`, `|강조|` 표기를 쓸 수 있다. */
function HeroBenefit({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const benefit = String(section.content.benefit ?? "");
  const badge = String(section.content.benefitBadge ?? "");
  if (!edit && !benefit.trim()) return null;
  return (
    <p className="pf-benefit">
      {edit || badge.trim() ? (
        <span className="pf-benefit-badge">
          <InlineText value={badge} placeholder={chromeText(chrome, "phHeroBenefitBadge", "혜택")} className="text-white" onCommit={textCommit(section, "benefitBadge", edit)} />
        </span>
      ) : null}
      <span>
        <BoldCopy value={benefit} multiline placeholder={chromeText(chrome, "phHeroBenefit", "혜택 문구")} onCommit={textCommit(section, "benefit", edit)} />
      </span>
    </p>
  );
}

/** 신뢰 태그 알약. */
function HeroTags({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const tags = heroTags(section.content.trustTags);
  const shown = edit ? tags : tags.filter((tag) => tag.text.trim());
  if (!edit && shown.length === 0) return null;
  function setTags(next: HeroTag[]) {
    edit?.patch(section.id, { ...section.content, trustTags: next.slice(0, HERO_TAG_MAX) });
  }
  return (
    <ul className="pf-tags">
      {shown.map((tag, index) => (
        <li key={`${section.id}-tag-${index}`} className={cn(edit && "group/edit")}>
          <InlineText
            value={tag.text}
            placeholder={chromeText(chrome, "phHeroTag", "태그")}
            onCommit={edit ? (value) => setTags(tags.map((item, itemIndex) => (itemIndex === index ? { text: value } : item))) : undefined}
          />
          {edit ? <EditRemoveX onClick={() => setTags(tags.filter((_, itemIndex) => itemIndex !== index))} /> : null}
        </li>
      ))}
      {edit && tags.length < HERO_TAG_MAX ? (
        <li>
          <button type="button" onClick={() => setTags([...tags, { text: chromeText(chrome, "phHeroTag", "태그") }])}>
            + {chromeText(chrome, "editAddItem", "항목 추가")}
          </button>
        </li>
      ) : null}
    </ul>
  );
}

function Hero({
  section,
  snapshot,
  live,
  narrow,
  phone,
}: {
  section: PageSection;
  snapshot: PageSnapshot;
  live: boolean;
  narrow: boolean;
  phone: boolean;
}) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const reducedMotion = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const content = section.content;
  // 히어로는 대표 이미지 1장만. 구버전 gallery(images)는 표시하지 않는다.
  const legacyGallery = heroGalleryImages(content as { images?: GalleryImageSlot[] });
  const imageUrl =
    String(content.imageUrl ?? "").trim() || String(legacyGallery[0]?.url ?? "").trim();
  const imageAlt = String(content.imageAlt ?? "").trim() || String(legacyGallery[0]?.alt ?? "").trim();
  const imageObjectPosition = String(content.imageObjectPosition ?? "center");
  const hasHeroMedia = Boolean(imageUrl);
  const [sceneUploading, setSceneUploading] = useState(false);
  async function uploadHero(file: File) {
    if (!edit) return;
    setSceneUploading(true);
    const url = await edit.upload(file).catch(() => "").finally(() => setSceneUploading(false));
    if (!url) return;
    edit.patch(section.id, { ...content, imageUrl: url, images: [] });
  }
  function removeHeroImage() {
    if (!edit) return;
    edit.patch(section.id, { ...content, imageUrl: "", images: [] });
  }
  const isInfo = snapshot.templateCode === "info";
  // 편집·태블릿·모바일·정보형은 스크롤 줌을 끈다. (기기 프레임 overflow와 충돌하고, 직방 미리보기도 정적 히어로)
  const motion = !isInfo && !edit && !reducedMotion && !narrow;
  useHeroZoom({ trackRef, stageRef, copyRef, enabled: motion, narrow });
  const formUrl = externalFormUrl(snapshot);
  const inquiryAnchor = leadInquiryAnchor(snapshot);
  const inquiryHref = `#${inquiryAnchor}`;
  const ctaFallback = String(snapshot.globalSettings.ctaLabel ?? "").trim() || chromeText(chrome, "phCta", "관심고객 등록");
  const ctaText = String(content.ctaLabel ?? "").trim() || ctaFallback;
  const overview = snapshot.sections.find((item) => item.sectionType === "overview" && item.isVisible);
  const secondaryText = String(content.secondaryCtaLabel ?? "").trim() || chromeText(chrome, "phHeroSecondary", "사업개요 살펴보기");
  const ctaClass = cn(
    "inline-flex h-12 items-center gap-2 rounded-[14px] bg-primary font-semibold text-white",
    narrow ? "justify-center px-4 text-sm" : "px-6 text-[17px]",
  );
  const secondaryClass = cn(
    "inline-flex h-12 items-center rounded-[14px] border border-white/30 font-semibold text-white",
    narrow ? "justify-center px-4 text-sm" : "px-6 text-[17px]",
  );
  function emptyMedia() {
    const value = String(content.emptyMediaLabel ?? "");
    if (!edit) return value.trim() || chromeText(chrome, "phEmptyMedia", "대표 이미지를 올려 주세요");
    return <InlineText value={value} placeholder={chromeText(chrome, "phEmptyMedia", "대표 이미지를 올려 주세요")} onCommit={textCommit(section, "emptyMediaLabel", edit)} />;
  }
  function heroMediaEdit() {
    if (!edit) return null;
    return (
      <>
        <label className="pf-scene-edit" title={chromeText(chrome, "mediaImageChange", "이미지 변경")}>
          <span className="pf-scene-edit-badge">
            {sceneUploading
              ? chromeText(chrome, "mediaUploading", "업로드 중…")
              : hasHeroMedia
                ? chromeText(chrome, "mediaImageChange", "이미지 변경")
                : chromeText(chrome, "mediaImageUpload", "이미지 올리기")}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={sceneUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void uploadHero(file);
            }}
          />
        </label>
        {hasHeroMedia ? (
          <EditRemoveX
            className="pf-edit-x-on-media absolute right-4 top-4 z-[2]"
            onClick={removeHeroImage}
          />
        ) : null}
      </>
    );
  }
  function heroActions() {
    return (
      <div className="pf-actions">
        {live && formUrl ? (
          <TrackedLink href={formUrl} target="_blank" slug={snapshot.publicSlug} eventName="lead_cta_click" className={ctaClass}>
            {ctaText}
            <span aria-hidden>↗</span>
          </TrackedLink>
        ) : live ? (
          <TrackedLink href={inquiryHref} slug={snapshot.publicSlug} eventName="lead_cta_click" className={ctaClass}>
            {ctaText}
            <span aria-hidden>↗</span>
          </TrackedLink>
        ) : (
          <a href={inquiryHref} className={ctaClass} onClick={(event) => { event.preventDefault(); if (!edit) scrollToAnchor(inquiryAnchor, event.currentTarget); }}>
            {edit ? (
              <InlineText value={String(content.ctaLabel ?? "")} placeholder={ctaFallback} className="text-white" onCommit={textCommit(section, "ctaLabel", edit)} />
            ) : (
              ctaText
            )}
            <span aria-hidden>↗</span>
          </a>
        )}
        {overview ? (
          live ? (
            <a href={`#${overview.anchorId}`} className={secondaryClass}>{secondaryText}</a>
          ) : (
            <a
              href={`#${overview.anchorId}`}
              className={secondaryClass}
              onClick={(event) => {
                event.preventDefault();
                if (!edit) scrollToAnchor(overview.anchorId, event.currentTarget);
              }}
            >
              {edit ? (
                <InlineText value={String(content.secondaryCtaLabel ?? "")} placeholder={chromeText(chrome, "phHeroSecondary", "사업개요 살펴보기")} className="text-white" onCommit={textCommit(section, "secondaryCtaLabel", edit)} />
              ) : (
                secondaryText
              )}
            </a>
          )
        ) : null}
        {!phone ? <HeroPhone section={section} snapshot={snapshot} live={live} /> : null}
      </div>
    );
  }
  function heroCopy() {
    return (
      <>
        <HeroRegion section={section} />
        <p className="pf-eyebrow">
          <span className="pf-dot" aria-hidden />
          <InlineText value={String(content.kicker ?? "")} placeholder={chromeText(chrome, "phKicker", "한 줄 소개")} onCommit={textCommit(section, "kicker", edit)} />
          <span className="pf-dot" aria-hidden />
        </p>
        <h1 className="pf-title break-keep">
          <InlineText
            value={String(content.headline ?? "")}
            multiline
            placeholder={chromeText(chrome, "phHeroHeadline", "히어로 제목")}
            onCommit={textCommit(section, "headline", edit)}
          />
        </h1>
        <p className="pf-sub">
          <BoldCopy value={String(content.subheadline ?? "")} multiline placeholder={chromeText(chrome, "phSubheadline", "안내 문구")} hint onCommit={textCommit(section, "subheadline", edit)} />
        </p>
        <HeroPrice section={section} />
        <HeroBenefit section={section} />
        {heroActions()}
        <HeroTags section={section} />
      </>
    );
  }
  if (isInfo) {
    // midday(프리미엄 화보형) 스펙: 풀블리드 · 좌 타이틀/우 슬로건 · 투명 가격 · 하단 태그+필 CTA
    const priceLabel = String(content.priceLabel ?? "");
    const priceType = String(content.priceType ?? "");
    const priceMain = String(content.priceMain ?? "");
    const priceSub = String(content.priceSub ?? "");
    const priceNote = String(content.priceNote ?? "");
    const showPrice = edit || [priceType, priceMain, priceSub, priceNote].some((value) => value.trim());
    const tags = heroTags(content.trustTags);
    const shownTags = edit ? tags : tags.filter((tag) => tag.text.trim());
    function setTags(next: HeroTag[]) {
      edit?.patch(section.id, { ...content, trustTags: next.slice(0, HERO_TAG_MAX) });
    }
    return (
      <div className="lc-hero" data-narrow={narrow ? "true" : "false"}>
        <div className="lc-hero__img" aria-hidden={imageAlt ? undefined : true}>
          {hasHeroMedia ? (
            <HeroPicture key={imageUrl} imageUrl={imageUrl} alt={imageAlt} objectPosition={imageObjectPosition} className="h-full w-full object-cover" priority />
          ) : (
            <div className="pf-scene-fallback" aria-hidden />
          )}
          {heroMediaEdit()}
          {edit && !hasHeroMedia ? (
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-end justify-center px-4 pb-8 text-center text-sm text-white/80">
              <span className="pointer-events-auto">{emptyMedia()}</span>
            </div>
          ) : null}
        </div>
        <div className="lc-hero__shade" aria-hidden />
        <div className="lc-hero__content">
          <div className="lc-hero__head">
            <div>
              <p className="lc-hero__label">
                <InlineText value={String(content.kicker ?? "")} placeholder={chromeText(chrome, "phKicker", "한 줄 소개")} onCommit={textCommit(section, "kicker", edit)} />
              </p>
              <MiddayTitleReveal
                as="h1"
                className="lc-hero__title"
                text={String(content.headline ?? "")}
                edit={Boolean(edit)}
                multiline
                placeholder={chromeText(chrome, "phHeroHeadline", "히어로 제목")}
                onCommit={textCommit(section, "headline", edit)}
              />
            </div>
            {(edit || String(content.subheadline ?? "").trim()) ? (
              <div className="lc-hero__slogan-slot">
                <p className="lc-hero__slogan">
                  <BoldCopy value={String(content.subheadline ?? "")} multiline placeholder={chromeText(chrome, "phSubheadline", "안내 문구")} onCommit={textCommit(section, "subheadline", edit)} />
                </p>
              </div>
            ) : null}
          </div>
          <div className="lc-hero__spacer" aria-hidden />
          {showPrice ? (
            <div className="lc-hero__mid">
              <aside className="lc-price-panel" aria-label="분양가">
                {edit || priceLabel.trim() ? (
                  <p className="lc-price-panel__label">
                    <InlineText value={priceLabel} placeholder={chromeText(chrome, "phPriceLabel", "분양가 라벨")} onCommit={textCommit(section, "priceLabel", edit)} />
                  </p>
                ) : null}
                {edit || priceType.trim() || priceMain.trim() ? (
                  <p className="lc-price-panel__row">
                    {edit || priceType.trim() ? (
                      <span className="lc-price-panel__type">
                        <InlineText value={priceType} placeholder={chromeText(chrome, "phPriceType", "타입")} onCommit={textCommit(section, "priceType", edit)} />
                      </span>
                    ) : null}
                    {edit || priceMain.trim() ? (
                      <span className="lc-price-panel__main">
                        <InlineText value={priceMain} placeholder={chromeText(chrome, "phPriceMain", "분양가")} onCommit={textCommit(section, "priceMain", edit)} />
                      </span>
                    ) : null}
                  </p>
                ) : null}
                {edit || priceSub.trim() ? (
                  <p className="lc-price-panel__sub">
                    <InlineText value={priceSub} placeholder={chromeText(chrome, "phPriceSub", "보조 가격")} onCommit={textCommit(section, "priceSub", edit)} />
                  </p>
                ) : null}
                {edit || priceNote.trim() ? (
                  <p className="lc-price-panel__note">
                    <InlineText value={priceNote} multiline placeholder={chromeText(chrome, "phPriceNote", "유의사항")} onCommit={textCommit(section, "priceNote", edit)} />
                  </p>
                ) : null}
              </aside>
            </div>
          ) : null}
          <div className="lc-hero__bottom">
            {edit || shownTags.length > 0 ? (
              <div className="lc-trust-tags">
                {shownTags.map((tag, index) => (
                  <span key={`${section.id}-tag-${index}`} className={cn("lc-trust-tag", edit && "group/edit")}>
                    <InlineText
                      value={tag.text}
                      placeholder={chromeText(chrome, "phHeroTag", "태그")}
                      onCommit={edit ? (value) => setTags(tags.map((item, itemIndex) => (itemIndex === index ? { text: value } : item))) : undefined}
                    />
                    {edit ? <EditRemoveX onClick={() => setTags(tags.filter((_, itemIndex) => itemIndex !== index))} /> : null}
                  </span>
                ))}
                {edit && tags.length < HERO_TAG_MAX ? (
                  <button type="button" className="lc-pill lc-pill--ghost-white lc-pill--sm" onClick={() => setTags([...tags, { text: chromeText(chrome, "phHeroTag", "태그") }])}>
                    + {chromeText(chrome, "editAddItem", "항목 추가")}
                  </button>
                ) : null}
              </div>
            ) : null}
            {live && formUrl ? (
              <TrackedLink href={formUrl} target="_blank" slug={snapshot.publicSlug} eventName="lead_cta_click" className="lc-pill lc-pill--light lc-pill--hero-cta">
                {ctaText}
                <span className="lc-pill__arrow" aria-hidden>↗</span>
              </TrackedLink>
            ) : live ? (
              <TrackedLink href={inquiryHref} slug={snapshot.publicSlug} eventName="lead_cta_click" className="lc-pill lc-pill--light lc-pill--hero-cta">
                {ctaText}
                <span className="lc-pill__arrow" aria-hidden>↗</span>
              </TrackedLink>
            ) : (
              <a
                href={inquiryHref}
                className="lc-pill lc-pill--light lc-pill--hero-cta"
                onClick={(event) => {
                  event.preventDefault();
                  if (!edit) scrollToAnchor(inquiryAnchor, event.currentTarget);
                }}
              >
                {edit ? (
                  <InlineText value={String(content.ctaLabel ?? "")} placeholder={ctaFallback} onCommit={textCommit(section, "ctaLabel", edit)} />
                ) : (
                  ctaText
                )}
                <span className="lc-pill__arrow" aria-hidden>↗</span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div ref={trackRef} className="pf-track" data-static={motion ? "false" : "true"} data-narrow={narrow ? "true" : "false"}>
      <div ref={stageRef} className="pf-stage">
        <div className="pf-scene" aria-hidden={imageAlt ? undefined : true}>
          {hasHeroMedia ? (
            <HeroPicture key={imageUrl} imageUrl={imageUrl} alt={imageAlt} objectPosition={imageObjectPosition} className="h-full w-full object-cover" priority />
          ) : (
            <div className="pf-scene-fallback" aria-hidden />
          )}
        </div>
        <div className="pf-shade" />
        <div className="pf-grain" />
        {heroMediaEdit()}
        {edit && !hasHeroMedia ? (
          <div className="pointer-events-none absolute inset-0 z-[1] flex items-end justify-center px-4 pb-24 text-center text-sm text-text-body">
            <span className="pointer-events-auto">{emptyMedia()}</span>
          </div>
        ) : null}
        <div ref={copyRef} className="pf-copy">
          <div className="mx-auto w-full max-w-6xl px-4 text-center">
            {heroCopy()}
          </div>
        </div>
        <div className="pf-scroll-hint" aria-hidden>
          <span className="pf-scroll-line" />
          <span>{chromeText(chrome, "phHeroScroll", "아래로 스크롤")}</span>
        </div>
      </div>
    </div>
  );
}

function Faq({ section, layout }: { section: PageSection; layout: ViewLayout }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const items = faqItems(section.content.items);
  const shown = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => edit || (item.question.trim() && item.answer.trim()));
  function setItems(next: Array<{ question: string; answer: string }>) {
    edit?.patch(section.id, { ...section.content, items: next.slice(0, FAQ_ITEM_MAX) });
  }
  return (
    <div className={cn("mx-auto grid max-w-6xl gap-10 px-4 py-20", layoutCols(layout, "lg:grid-cols-[1fr_1.1fr] lg:gap-20", "grid-cols-[1fr_1.1fr] gap-12"))}>
      <div>
        <SectionEyebrow section={section} />
        <h2 className={sectionTitleClass(layout)}>
          <InlineText value={String(section.content.heading ?? section.title)} multiline onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
        </h2>
        {(edit || String(section.content.body ?? "").trim()) ? (
          <p className="mt-4 max-w-md text-text-body">
            <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
          </p>
        ) : null}
      </div>
      <div className="pf-faqs">
        {shown.map(({ item, index }, position) =>
          edit ? (
            <div key={`${section.id}-faq-${index}`} className="pf-faq-item group/edit relative border-b border-border py-5 pr-10">
              <p className="font-semibold">
                <span className="pf-faq-num mr-3" aria-hidden>{String(position + 1).padStart(2, "0")}</span>
                <InlineText
                  value={item.question}
                  placeholder={chromeText(chrome, "phFaqQuestion", "질문을 입력하세요")}
                  onCommit={(value) => setItems(items.map((row, rowIndex) => (rowIndex === index ? { ...row, question: value } : row)))}
                />
              </p>
              <p className="mt-2 text-text-body">
                <InlineText
                  value={item.answer}
                  multiline
                  placeholder={chromeText(chrome, "phFaqAnswer", "답변을 입력하세요")}
                  onCommit={(value) => setItems(items.map((row, rowIndex) => (rowIndex === index ? { ...row, answer: value } : row)))}
                />
              </p>
              <EditRemoveX
                className="absolute right-0 top-5"
                onClick={() => setItems(items.filter((_, rowIndex) => rowIndex !== index))}
              />
            </div>
          ) : (
            <details key={`${section.id}-faq-${index}`} className="pf-faq-item border-b border-border" open={position === 0 ? true : undefined}>
              <summary>
                <span className="pf-faq-num" aria-hidden>{String(position + 1).padStart(2, "0")}</span>
                <span>{item.question}</span>
              </summary>
              <p>{item.answer}</p>
            </details>
          ),
        )}
        {edit && items.length < FAQ_ITEM_MAX ? (
          <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setItems([...items, { question: "", answer: "" }])}>
            {chromeText(chrome, "editAddItem", "항목 추가")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LocationMatrix({ section, narrow }: { section: PageSection; narrow: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const stored = locationMatrix(section.content as { matrix?: LocationMatrixItem[] });
  const rows = stored ?? LOCATION_MATRIX_DEFAULTS;
  const filled = rows.some((row) => row.label.trim() || row.body.trim());
  const [pickIndex, setPickIndex] = useState<number | null>(null);
  if (!edit && (!stored || !filled)) return null;
  function save(next: LocationMatrixItem[]) {
    edit?.patch(section.id, { ...section.content, matrix: next });
  }
  const pickRow = pickIndex !== null ? rows[pickIndex] : null;
  return (
    <>
    <div
      className={cn("mt-8 grid border-b border-border", narrow ? "grid-cols-1" : "grid-cols-2")}
      data-narrow={narrow ? "true" : undefined}
    >
      {rows.map((row, index) => (
        <div
          key={`${section.id}-matrix-${index}`}
          className={cn("border-t border-border p-4 sm:p-6", !narrow && index % 2 === 1 && "border-l")}
        >
          <div className="flex items-center gap-2 text-primary">
            {edit ? (
              <button
                type="button"
                className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft p-1.5"
                aria-label={chromeText(chrome, "ariaIconChange", "아이콘 바꾸기")}
                onClick={() => setPickIndex(index)}
              >
                <PackIcon icon={row.icon} />
              </button>
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft p-1.5">
                <PackIcon icon={row.icon} />
              </span>
            )}
          </div>
          <h3 className="mt-3 text-xl font-semibold">
            <InlineText
              value={row.label}
              placeholder={chromeText(chrome, "phStatCat", "분류")}
              onCommit={edit ? (value) => save(rows.map((item, itemIndex) => (itemIndex === index ? { ...item, label: value } : item))) : undefined}
            />
          </h3>
          {(edit || row.body.trim()) ? (
            <p className="mt-2 text-sm text-text-body">
              <InlineText
                value={row.body}
                multiline
                placeholder={chromeText(chrome, "phBody", "설명")}
                onCommit={edit ? (value) => save(rows.map((item, itemIndex) => (itemIndex === index ? { ...item, body: value } : item))) : undefined}
              />
            </p>
          ) : null}
        </div>
      ))}
    </div>
    {edit && pickRow && pickIndex !== null ? (
      <IconPickerModal
        eyebrow="LOCATION ICON"
        value={pickRow.icon}
        onPick={(icon) => save(rows.map((item, itemIndex) => (itemIndex === pickIndex ? { ...item, icon } : item)))}
        onClose={() => setPickIndex(null)}
      />
    ) : null}
    </>
  );
}

function OverviewStats({ section, layout }: { section: PageSection; layout: ViewLayout }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const stats = ((section.content.stats as Array<{ value?: string; label?: string }> | undefined) ?? [])
    .slice(0, OVERVIEW_STAT_MAX)
    .map((item) => ({ value: String(item.value ?? ""), label: String(item.label ?? "") }));
  const visible = stats.filter((item) => edit || item.value.trim() || item.label.trim());
  if (visible.length === 0) return null;
  function setStats(next: Array<{ value: string; label: string }>) {
    edit?.patch(section.id, { ...section.content, stats: next.slice(0, OVERVIEW_STAT_MAX) });
  }
  return (
    <div className="mt-12 border-y border-border">
    <div className={cn("mx-auto grid max-w-6xl grid-cols-2", layoutCols(layout, "lg:grid-cols-4", "grid-cols-4"))}>
      {visible.map((item, index) => (
        <div
          key={`${section.id}-stat-${index}`}
          className={cn(
            "group/edit relative flex min-w-0 flex-col justify-center",
            layout === "mobile" ? "min-h-[120px] px-3 py-6" : "min-h-[160px] px-6 py-8",
            layout === "mobile" && index % 2 === 1 && "border-l border-border",
            layout === "mobile" && index >= 2 && "border-t border-border",
            layout !== "mobile" && index > 0 && "border-l border-border",
          )}
        >
          {edit && stats.length > 1 ? (
            <EditRemoveX
              className="absolute right-3 top-3"
              onClick={() => setStats(stats.filter((_, rowIndex) => rowIndex !== index))}
            />
          ) : null}
          <p
            className={cn(
              "max-w-full font-semibold tracking-tight text-primary break-keep",
              layout === "mobile" && "text-3xl",
              layout === "tablet" && "text-3xl",
              layout === "desktop" && "text-4xl xl:text-5xl",
            )}
          >
            <InlineText
              value={item.value}
              placeholder={chromeText(chrome, "phStatValue", "숫자")}
              onCommit={edit ? (value) => setStats(stats.map((row, rowIndex) => (rowIndex === index ? { ...row, value } : row))) : undefined}
            />
          </p>
          <p className="mt-1 text-sm text-text-muted">
            <InlineText
              value={item.label}
              placeholder={chromeText(chrome, "phStatName", "이름")}
              onCommit={edit ? (value) => setStats(stats.map((row, rowIndex) => (rowIndex === index ? { ...row, label: value } : row))) : undefined}
            />
          </p>
        </div>
      ))}
      {edit && stats.length < OVERVIEW_STAT_MAX ? (
        <button type="button" className="min-h-[160px] border-l border-dashed border-border px-4 text-sm font-semibold text-primary" onClick={() => setStats([...stats, { value: chromeText(chrome, "seedStatValue", "525"), label: chromeText(chrome, "seedStatLabel", "세대수") }])}>
          {chromeText(chrome, "editAddStat", "수치 추가")}
        </button>
      ) : null}
    </div>
    </div>
  );
}

function Overview({ section, layout, info = false }: { section: PageSection; layout: ViewLayout; info?: boolean }) {
  const phone = layout === "mobile";
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const facts = ((section.content.facts as Array<{ label: string; value: string }>) ?? []).slice(0, OVERVIEW_FACT_MAX);
  const schedule = ((section.content.schedule as Array<{ title?: string; date?: string; note?: string }>) ?? [])
    .slice(0, OVERVIEW_SCHEDULE_MAX)
    .map((item) => ({
      title: String(item.title ?? ""),
      date: String(item.date ?? ""),
      note: String(item.note ?? ""),
    }));
  const visibleSchedule = edit ? schedule : schedule.filter((item) => item.title.trim() || item.date.trim() || item.note.trim());
  function setFacts(next: Array<{ label: string; value: string }>) {
    edit?.patch(section.id, { ...section.content, facts: next.slice(0, OVERVIEW_FACT_MAX) });
  }
  function setSchedule(next: Array<{ title: string; date: string; note: string }>) {
    edit?.patch(section.id, { ...section.content, schedule: next.slice(0, OVERVIEW_SCHEDULE_MAX) });
  }
  const factsBlock = (edit || facts.some((fact) => fact.label.trim() || fact.value.trim())) ? (
    info ? (
      <div className="pi-facts-grid">
        {facts.map((fact, index) => edit || fact.label.trim() || fact.value.trim() ? (
          <div key={`${section.id}-fact-${index}`} className={cn("group/edit relative", edit && facts.length > 1 && "pr-8")}>
            <div className="pi-fact-label">
              <InlineText
                value={fact.label}
                placeholder={chromeText(chrome, "phItem", "항목")}
                onCommit={edit ? (value) => setFacts(facts.map((item, itemIndex) => (itemIndex === index ? { ...item, label: value } : item))) : undefined}
              />
            </div>
            <p className="pi-fact-value break-keep">
              <InlineText
                value={fact.value}
                placeholder={chromeText(chrome, "phContent", "내용")}
                onCommit={edit ? (value) => setFacts(facts.map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item))) : undefined}
              />
            </p>
            {edit && facts.length > 1 ? (
              <EditRemoveX
                className="absolute right-1 top-3"
                onClick={() => setFacts(facts.filter((_, itemIndex) => itemIndex !== index))}
              />
            ) : null}
          </div>
        ) : null)}
      </div>
    ) : (
      <div className="mt-8 border-b border-border">
        {facts.map((fact, index) => edit || fact.label.trim() || fact.value.trim() ? (
          <div
            key={`${section.id}-fact-${index}`}
            className={cn(
              "group/edit relative grid border-t border-border",
              phone ? "grid-cols-1" : "grid-cols-[120px_1fr] sm:grid-cols-[150px_1fr]",
              edit && facts.length > 1 && "pr-8",
            )}
          >
            <div className={cn("py-4 text-sm font-medium text-text-muted sm:pr-4", phone && "pb-1")}>
              <InlineText
                value={fact.label}
                placeholder={chromeText(chrome, "phItem", "항목")}
                onCommit={edit ? (value) => setFacts(facts.map((item, itemIndex) => (itemIndex === index ? { ...item, label: value } : item))) : undefined}
              />
            </div>
            <div className={cn("pb-4", phone ? "pt-0" : "py-4")}>
              <p className="font-semibold break-keep">
                <InlineText
                  value={fact.value}
                  placeholder={chromeText(chrome, "phContent", "내용")}
                  onCommit={edit ? (value) => setFacts(facts.map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item))) : undefined}
                />
              </p>
            </div>
            {edit && facts.length > 1 ? (
              <EditRemoveX
                className="absolute right-0 top-1/2 -translate-y-1/2"
                onClick={() => setFacts(facts.filter((_, itemIndex) => itemIndex !== index))}
              />
            ) : null}
          </div>
        ) : null)}
      </div>
    )
  ) : null;
  return (
    <div className="border-b border-border">
    {info ? (
      <div className="pi-overview-stats-first pt-6 sm:pt-10">
        <OverviewStats section={section} layout={layout} />
      </div>
    ) : null}
    <div className="mx-auto max-w-6xl px-4 pt-14 sm:pt-20">
      <SectionEyebrow section={section} />
      <h2 className={sectionTitleClass(layout)}>
        <InlineText value={String(section.content.heading ?? section.title)} multiline onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
      </h2>
      {(edit || String(section.content.body ?? "").trim()) ? (
      <p className="mt-4 max-w-3xl text-text-body">
        <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
      </p>
      ) : null}
      {factsBlock}
      {edit && facts.length < OVERVIEW_FACT_MAX ? (
        <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setFacts([...facts, { label: chromeText(chrome, "seedFactLabel", "위치"), value: chromeText(chrome, "seedFactValue", SAMPLE_SITE.address) }])}>
          {chromeText(chrome, "editAddItem", "항목 추가")}
        </button>
      ) : null}
    </div>
    {info ? null : <OverviewStats section={section} layout={layout} />}
    <div className="mx-auto max-w-6xl px-4 pb-14 sm:pb-20">
      {(edit || String(section.content.disclaimer ?? "").trim()) ? (
        <p className="mt-4 text-sm text-text-muted">
          <BoldCopy value={String(section.content.disclaimer ?? "")} multiline onCommit={textCommit(section, "disclaimer", edit)} placeholder={chromeText(chrome, "phDisclaimer", "하단 안내")} />
        </p>
      ) : null}
      {visibleSchedule.length > 0 || edit ? (
        <div className="mt-12">
          <h3 className="text-xl font-medium">
            {edit ? (
              <InlineText
                value={String(section.content.scheduleTitle ?? "")}
                placeholder={chromeText(chrome, "phScheduleTitle", "분양 일정")}
                onCommit={(value) => edit.patch(section.id, { ...section.content, scheduleTitle: value })}
              />
            ) : (
              String(section.content.scheduleTitle ?? "").trim() || chromeText(chrome, "phScheduleTitle", "분양 일정")
            )}
          </h3>
          <ol className="mt-4">
            {visibleSchedule.map((item, index) => (
              <li key={`${section.id}-schedule-${index}`} className={cn("group/edit flex gap-4 border-b border-border py-4 last:border-b-0", edit && "relative pr-9")}>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className={cn("flex gap-3", phone ? "flex-col" : "items-start justify-between")}>
                    <span className="font-semibold">
                      <InlineText
                        value={item.title}
                        placeholder={chromeText(chrome, "phSchedule", "일정")}
                        onCommit={edit ? (value) => setSchedule(schedule.map((row, rowIndex) => (rowIndex === index ? { ...row, title: value } : row))) : undefined}
                      />
                    </span>
                    <span className="text-text-body">
                      <InlineText
                        value={item.date}
                        placeholder={chromeText(chrome, "phDate", "날짜")}
                        onCommit={edit ? (value) => setSchedule(schedule.map((row, rowIndex) => (rowIndex === index ? { ...row, date: value } : row))) : undefined}
                      />
                    </span>
                  </div>
                  {(edit || item.note.trim()) ? (
                    <p className="mt-1 text-sm text-text-muted">
                      <BoldCopy
                        value={item.note}
                        multiline
                        placeholder={chromeText(chrome, "phScheduleNote", "보충 안내")}
                        onCommit={edit ? (value) => setSchedule(schedule.map((row, rowIndex) => (rowIndex === index ? { ...row, note: value } : row))) : undefined}
                      />
                    </p>
                  ) : null}
                </div>
                {edit ? (
                  <EditRemoveX
                    className="absolute right-0 top-4"
                    onClick={() => setSchedule(schedule.filter((_, rowIndex) => rowIndex !== index))}
                  />
                ) : null}
              </li>
            ))}
          </ol>
          {edit && schedule.length < OVERVIEW_SCHEDULE_MAX ? (
            <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setSchedule([...schedule, { title: chromeText(chrome, "seedScheduleTitle", "일정"), date: chromeText(chrome, "seedScheduleDate", "날짜를 입력하세요"), note: "" }])}>
              {chromeText(chrome, "editAddSchedule", "일정 추가")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
    </div>
  );
}

function Cards({ section, layout }: { section: PageSection; layout: ViewLayout }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const cards = locationCards(section.content.cards);
  function setCards(next: Array<{ title: string; body: string; imageUrl?: string }>) {
    edit?.patch(section.id, { ...section.content, cards: locationCards(next) });
  }
  const slides = cards.flatMap((card) => (card.imageUrl ? [{ url: card.imageUrl, alt: card.title }] : []));
  const [photo, setPhoto] = useState<number | null>(null);
  const [aerialOpen, setAerialOpen] = useState<number | null>(null);
  const images = sectionGalleryImages(section.content.images);
  const aerial = images[0];
  const extras = images.slice(1);
  function setImages(next: Array<{ url: string; alt?: string; caption?: string }>) {
    edit?.patch(section.id, { ...section.content, images: next.slice(0, GALLERY_IMAGE_MAX) });
  }
  const emptyAerialLabel = edit ? (
    <InlineText value={String(section.content.emptyImageLabel ?? "")} placeholder={chromeText(chrome, "phLocationEmpty", "입지 위치도")} onCommit={textCommit(section, "emptyImageLabel", edit)} />
  ) : null;
  const showAerial = Boolean(edit || aerial);
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className={cn("grid gap-10", showAerial && layoutCols(layout, "lg:grid-cols-[1.08fr_.92fr] lg:gap-14", "grid-cols-[1.05fr_.95fr] gap-8"))}>
          {showAerial ? (
            <div className={cn("relative overflow-hidden rounded-[16px] border border-border bg-white", layout === "desktop" ? "min-h-[560px]" : layout === "tablet" ? "min-h-[320px]" : "min-h-[240px]")}>
              {edit ? (
                <EditableImage
                  src={aerial?.url}
                  alt={imageAltText(aerial)}
                  className="absolute inset-0"
                  imageClassName="h-full w-full object-cover"
                  emptyClassName="flex items-center justify-center"
                  emptyLabel={emptyAerialLabel}
                  onUpload={(url) => setImages(aerial ? images.map((image, index) => (index === 0 ? { ...image, url } : image)) : [{ url, alt: "", caption: "" }, ...images])}
                />
              ) : aerial ? (
                <button type="button" className="absolute inset-0 block h-full w-full" onClick={() => setAerialOpen(0)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={aerial.url} alt={imageAltText(aerial)} className="h-full w-full object-cover" />
                </button>
              ) : null}
              {aerial && (edit || imageDisplayCaption(aerial)) ? (
                <p className="absolute inset-x-0 bottom-0 bg-text-primary/70 px-4 py-3 text-sm text-white">
                  <InlineText
                    value={imageDisplayCaption(aerial)}
                    placeholder={chromeText(chrome, "phPhotoCaption", "사진 설명")}
                    onCommit={edit ? (value) => setImages(images.map((image, index) => (index === 0 ? { ...image, caption: value } : image))) : undefined}
                  />
                </p>
              ) : null}
              {edit && aerial ? (
                <EditRemoveX className="pf-edit-x-on-media absolute right-3 top-3 z-10" onClick={() => setImages(images.slice(1))} />
              ) : null}
            </div>
          ) : null}
          <div className="min-w-0">
            <SectionEyebrow section={section} />
            <h2 className={sectionTitleClass(layout)}>
              <InlineText value={String(section.content.heading ?? section.title)} multiline onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
            </h2>
            {(edit || String(section.content.body ?? "").trim()) ? (
            <p className="mt-4 max-w-3xl text-text-body">
              <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
            </p>
            ) : null}
            <LocationMatrix section={section} narrow={layout === "mobile"} />
            {extras.length > 0 || (edit && images.length > 0 && images.length < GALLERY_IMAGE_MAX) ? (
              <div className="mt-6 flex gap-2 overflow-x-auto">
                {extras.map((image, extraIndex) =>
                  edit ? (
                    <div key={`${image.url}-${extraIndex}`} className="group/edit relative h-16 w-24 shrink-0">
                      <EditableImage
                        src={image.url}
                        alt={imageAltText(image)}
                        className="h-full w-full rounded-[8px] border border-border"
                        imageClassName="h-full w-full object-cover"
                        onUpload={(url) => setImages(images.map((row, rowIndex) => (rowIndex === extraIndex + 1 ? { ...row, url } : row)))}
                      />
                      <EditRemoveX
                        className="pf-edit-x-on-media absolute -right-1 -top-1 z-10"
                        onClick={() => setImages(images.filter((_, rowIndex) => rowIndex !== extraIndex + 1))}
                      />
                    </div>
                  ) : (
                    <button key={`${image.url}-${extraIndex}`} type="button" className="h-16 w-24 shrink-0 overflow-hidden rounded-[8px] border border-border" onClick={() => setAerialOpen(extraIndex + 1)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.url} alt={imageAltText(image)} className="h-full w-full object-cover" />
                    </button>
                  ),
                )}
                {edit && images.length < GALLERY_IMAGE_MAX ? (
                  <EditableImage
                    alt=""
                    className="h-16 w-24 shrink-0 rounded-[8px]"
                    imageClassName="h-full w-full object-cover"
                    emptyClassName="flex items-center justify-center"
                    emptyLabel={chromeText(chrome, "editAddItem", "항목 추가")}
                    onUpload={(url) => setImages([...images, { url, alt: "", caption: "" }])}
                  />
                ) : null}
              </div>
            ) : null}
            {edit || String(section.content.galleryCaption ?? "").trim() ? (
              <p className="mt-3 text-sm text-text-muted">
                <InlineText
                  value={String(section.content.galleryCaption ?? "")}
                  placeholder={chromeText(chrome, "phPhotoCaption", "사진 설명")}
                  onCommit={textCommit(section, "galleryCaption", edit)}
                />
              </p>
            ) : null}
          </div>
        </div>
        <div className={cn("grid gap-4", cards.length > 0 && "mt-10", layout === "tablet" && "grid-cols-2", layout === "desktop" && "lg:grid-cols-6", cards.length === 0 && "hidden")}>
          {cards.map((card, index) => {
            // 3열 기준으로 배치하되, 마지막 줄이 비면 남은 카드를 늘려 빈 칸(고아 카드)이 없게 한다.
            const rest = cards.length % 3;
            const lastRow = rest !== 0 && index >= cards.length - rest;
            const span = !lastRow ? "lg:col-span-2" : rest === 1 ? "lg:col-span-6" : "lg:col-span-3";
            const oddTail = cards.length % 2 === 1 && index === cards.length - 1;
            return (
            <div key={`${section.id}-card-${index}`} className={cn("ui-card", layout === "desktop" && span, layout === "tablet" && oddTail && "col-span-2")}>
              {card.imageUrl && !edit ? (
                <button type="button" className="mb-4 block w-full" onClick={() => setPhoto(slides.findIndex((slide) => slide.url === card.imageUrl))}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.imageUrl} alt={card.title} className="h-40 w-full rounded-[8px] object-cover" />
                </button>
              ) : edit && card.imageUrl ? (
                <EditableImage
                  src={card.imageUrl}
                  alt={card.title}
                  className="mb-4 rounded-[8px]"
                  imageClassName="h-40 w-full object-cover"
                  onUpload={(url) => setCards(cards.map((item, itemIndex) => (itemIndex === index ? { ...item, imageUrl: url } : item)))}
                />
              ) : null}
              <h3 className="text-xl font-semibold">
                <InlineText
                  value={card.title}
                  placeholder={chromeText(chrome, "phTitle", "제목")}
                  onCommit={edit ? (value) => setCards(cards.map((item, itemIndex) => (itemIndex === index ? { ...item, title: value } : item))) : undefined}
                />
              </h3>
              <p className="mt-2 text-text-body">
                <InlineText
                  value={card.body}
                  multiline
                  placeholder={chromeText(chrome, "phContent", "내용")}
                  onCommit={edit ? (value) => setCards(cards.map((item, itemIndex) => (itemIndex === index ? { ...item, body: value } : item))) : undefined}
                />
              </p>
              {edit ? (
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <label className="cursor-pointer font-medium text-primary">
                    {card.imageUrl ? chromeText(chrome, "mediaReplace", "사진 바꾸기") : chromeText(chrome, "phPhoto", "사진 추가")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void edit.upload(file).then((url) => {
                          setCards(cards.map((item, itemIndex) => (itemIndex === index ? { ...item, imageUrl: url } : item)));
                        }).catch(() => undefined);
                      }}
                    />
                  </label>
                  <EditRemoveX onClick={() => setCards(cards.filter((_, itemIndex) => itemIndex !== index))} />
                </div>
              ) : null}
            </div>
            );
          })}
        </div>
        {edit && cards.length < LOCATION_CARD_MAX ? (
          <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setCards([...cards, { title: chromeText(chrome, "seedCardTitle", "항목"), body: chromeText(chrome, "seedCardBody", "내용을 입력하세요.") }])}>
            {chromeText(chrome, "editAddItem", "항목 추가")}
          </button>
        ) : null}
      </div>
      {photo !== null && slides.length > 0 ? <PhotoViewer images={slides} index={Math.max(0, photo)} onIndex={setPhoto} onClose={() => setPhoto(null)} /> : null}
      {aerialOpen !== null && images.length > 0 ? <PhotoViewer images={images} index={Math.min(Math.max(0, aerialOpen), images.length - 1)} onIndex={setAerialOpen} onClose={() => setAerialOpen(null)} /> : null}
    </div>
  );
}

function Premium({ section, layout, info = false }: { section: PageSection; layout: ViewLayout; info?: boolean }) {
  const chrome = useEditorChrome();
  const edit = useCanvasEdit();
  const items = premiumItems(section.content.items);
  function setItems(next: PremiumItem[]) {
    edit?.patch(section.id, { ...section.content, items: next.slice(0, PREMIUM_ITEM_MAX) });
  }
  const slides = items.flatMap((item) => (item.imageUrl ? [{ url: item.imageUrl, alt: item.title }] : []));
  const hasGalleryImages = sectionGalleryImages(section.content.images).length > 0;
  const [photo, setPhoto] = useState<number | null>(null);
  const [pickIndex, setPickIndex] = useState<number | null>(null);
  // 특장점에 사진이 하나라도 있으면 왼쪽 큰 슬라이드 + 오른쪽 번호 카드 배치를 쓴다. 사진이 없으면 2×2 카드.
  // 단지 정보형은 번호형 정보 그리드로 통일한다.
  const slideItems = items.flatMap((item, index) => (item.imageUrl ? [index] : []));
  const slideMode = !info && slideItems.length > 0;
  const [activeItem, setActiveItem] = useState(0);
  const [slidePaused, setSlidePaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const safeActive = Math.min(activeItem, Math.max(0, items.length - 1));
  const autoplay = !edit && !reducedMotion && !slidePaused && slideItems.length > 1;
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => {
      setActiveItem((current) => {
        const at = slideItems.indexOf(current);
        return slideItems[(at + 1) % slideItems.length] ?? slideItems[0] ?? 0;
      });
    }, 3000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, slideItems.join(",")]);
  const slideCount = slideItems.length;
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <SectionEyebrow section={section} />
      <h2 className={sectionTitleClass(layout)}>
        <InlineText value={String(section.content.heading ?? section.title)} multiline onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
      </h2>
      {(edit || String(section.content.body ?? "").trim()) ? (
        <p className="mt-4 max-w-3xl text-text-body">
          <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
        </p>
      ) : null}
      {(edit || String(section.content.copyHeadline ?? "").trim()) ? (
        <h3 className="mt-8 text-2xl font-medium whitespace-pre-wrap break-keep">
          {edit ? (
            <InlineText
              value={String(section.content.copyHeadline ?? "")}
              multiline
              placeholder={chromeText(chrome, "phEmphasisTitle", "강조 제목")}
              onCommit={(value) => edit.patch(section.id, { ...section.content, copyHeadline: value })}
            />
          ) : (
            <MarkedText text={String(section.content.copyHeadline ?? "")} />
          )}
        </h3>
      ) : null}
      {(edit || String(section.content.copyBody ?? "").trim()) ? (
        <p className="mt-3 max-w-3xl text-text-body">
          <BoldCopy
            value={String(section.content.copyBody ?? "")}
            multiline
            placeholder={chromeText(chrome, "phEmphasisBody", "강조 설명")}
            onCommit={edit ? (value) => edit.patch(section.id, { ...section.content, copyBody: value }) : undefined}
          />
        </p>
      ) : null}
      {edit || hasGalleryImages ? (
        <div className="mt-8">
          <ThumbGallery
            images={edit ? sectionGallerySlots(section.content.images) : sectionGalleryImages(section.content.images)}
            upload={edit?.upload}
            onCommit={edit ? (next) => edit.patch(section.id, { ...section.content, images: next.slice(0, GALLERY_IMAGE_MAX) }) : undefined}
          />
        </div>
      ) : null}
      {hasGalleryImages && (edit || String(section.content.galleryCaption ?? "").trim()) ? (
        <p className="mt-3 text-sm text-text-muted">
          <InlineText
            value={String(section.content.galleryCaption ?? "")}
            placeholder={chromeText(chrome, "phPhotoCaption", "사진 설명")}
            onCommit={edit ? (value) => edit.patch(section.id, { ...section.content, galleryCaption: value }) : undefined}
          />
        </p>
      ) : null}
      {edit ? <p className="mt-2 text-xs text-text-muted">{chromeText(chrome, "hintPremium", `**이렇게** 감싸면 공개 페이지에서 굵게 보입니다. 특장점은 최대 ${PREMIUM_ITEM_MAX}개입니다.`)}</p> : null}
      {info ? (
      <div className="pi-premium-grid" data-narrow={layout === "mobile" ? "true" : undefined}>
        {items.map((item, index) => (
          <article key={`${section.id}-item-${index}`} className="group/edit relative">
            <p className="pi-premium-num">{String(index + 1).padStart(2, "0")}</p>
            {edit ? (
              <button
                type="button"
                className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft p-1.5"
                aria-label={chromeText(chrome, "ariaIconChange", "아이콘 바꾸기")}
                onClick={() => setPickIndex(index)}
              >
                <PackIcon icon={item.icon} />
              </button>
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft p-1.5">
                <PackIcon icon={item.icon} />
              </span>
            )}
            <h3 className="text-xl font-semibold break-keep">
              {edit ? (
                <InlineText
                  value={item.title}
                  placeholder={chromeText(chrome, "phTitle", "제목")}
                  onCommit={(value) => setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, title: value } : row)))}
                />
              ) : (
                <MarkedText text={item.title} />
              )}
            </h3>
            <p className="text-sm text-text-body">
              <BoldCopy
                value={item.body}
                multiline
                placeholder={chromeText(chrome, "phContent", "내용")}
                onCommit={edit ? (value) => setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, body: value } : row))) : undefined}
              />
            </p>
            {edit ? (
              <div className="mt-1 flex items-center gap-3 text-xs">
                <label className="cursor-pointer font-medium text-primary">
                  {item.imageUrl ? chromeText(chrome, "mediaReplace", "사진 바꾸기") : chromeText(chrome, "phPhoto", "사진 추가")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void edit.upload(file).then((url) => {
                        setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, imageUrl: url } : row)));
                      }).catch(() => undefined);
                    }}
                  />
                </label>
                {items.length > 1 ? <EditRemoveX onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} /> : null}
              </div>
            ) : null}
            {!edit && item.imageUrl ? (
              <button type="button" className="mt-1 block w-full overflow-hidden rounded-[8px]" onClick={() => setPhoto(slides.findIndex((slide) => slide.url === item.imageUrl))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.title} className="h-36 w-full object-cover" />
              </button>
            ) : null}
          </article>
        ))}
      </div>
      ) : (
      <div
        className={cn(
          "mt-10 grid gap-6",
          slideMode
            ? layoutCols(layout, "lg:grid-cols-[1.1fr_1fr] lg:gap-10", "grid-cols-[1.05fr_.95fr] gap-8")
            : layoutCols(layout, "lg:grid-cols-2"),
        )}
        onMouseEnter={() => setSlidePaused(true)}
        onMouseLeave={() => setSlidePaused(false)}
      >
        {slideMode ? (
          <div className={cn("relative overflow-hidden rounded-[16px] border border-border bg-surface", layout === "desktop" ? "aspect-auto min-h-[480px]" : layout === "tablet" ? "aspect-[4/3] min-h-[280px]" : "aspect-[4/3] min-h-[220px]")}>
            {edit ? (
              <EditableImage
                src={items[safeActive]?.imageUrl}
                alt={items[safeActive]?.title ?? ""}
                className="absolute inset-0"
                imageClassName="h-full w-full object-cover"
                emptyClassName="flex items-center justify-center"
                onUpload={(url) => setItems(items.map((row, itemIndex) => (itemIndex === safeActive ? { ...row, imageUrl: url } : row)))}
              />
            ) : (
              <button
                type="button"
                className="absolute inset-0 block"
                onClick={() => setPhoto(Math.max(0, slideItems.indexOf(slideItems.includes(safeActive) ? safeActive : (slideItems[0] ?? 0))))}
              >
                {slideItems.map((itemIndex) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${section.id}-slide-${itemIndex}`}
                    src={items[itemIndex]?.imageUrl}
                    alt={items[itemIndex]?.title ?? ""}
                    className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-700", itemIndex === (slideItems.includes(safeActive) ? safeActive : slideItems[0]) ? "opacity-100" : "opacity-0")}
                  />
                ))}
              </button>
            )}
            {slideCount > 1 || edit ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center">
                <div className="pointer-events-auto flex items-center rounded-full bg-black/40 px-2">
                  {items.map((item, itemIndex) =>
                    edit || item.imageUrl ? (
                      <button
                        key={`${section.id}-dot-${itemIndex}`}
                        type="button"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center p-1.5"
                        aria-label={`${itemIndex + 1}`}
                        aria-current={itemIndex === safeActive ? "true" : undefined}
                        onClick={() => setActiveItem(itemIndex)}
                      >
                        <span className={cn("block h-2 rounded-full transition-all", itemIndex === safeActive ? "w-6 bg-white" : "w-2 bg-white/50")} />
                      </button>
                    ) : null,
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className={slideMode ? "grid content-start gap-4" : "contents"}>
        {items.map((item, index) => (
          <div
            key={`${section.id}-item-${index}`}
            className={cn("overflow-hidden rounded-[16px] border transition-colors", slideMode && index === safeActive ? "border-primary" : "border-border")}
            onMouseEnter={() => { if (slideMode && (edit || item.imageUrl)) setActiveItem(index); }}
            onFocus={() => { if (slideMode && (edit || item.imageUrl)) setActiveItem(index); }}
          >
            {!slideMode && item.imageUrl && !edit ? (
              <button type="button" className="block w-full" onClick={() => setPhoto(slides.findIndex((slide) => slide.url === item.imageUrl))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.title} className="h-44 w-full object-cover" />
              </button>
            ) : !slideMode && edit && item.imageUrl ? (
              <EditableImage
                src={item.imageUrl}
                alt={item.title}
                imageClassName="h-44 w-full object-cover"
                onUpload={(url) => setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, imageUrl: url } : row)))}
              />
            ) : null}
            <div className="p-6">
              {slideMode ? <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-text-muted">{String(index + 1).padStart(2, "0")}</p> : null}
              {edit ? (
                <button
                  type="button"
                  className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft p-1.5"
                  aria-label={chromeText(chrome, "ariaIconChange", "아이콘 바꾸기")}
                  onClick={() => setPickIndex(index)}
                >
                  <PackIcon icon={item.icon} />
                </button>
              ) : (
                <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft p-1.5">
                  <PackIcon icon={item.icon} />
                </span>
              )}
              <h3 className="text-xl font-semibold break-keep">
                {edit ? (
                  <InlineText
                    value={item.title}
                    placeholder={chromeText(chrome, "phTitle", "제목")}
                    onCommit={(value) => setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, title: value } : row)))}
                  />
                ) : (
                  <MarkedText text={item.title} />
                )}
              </h3>
              <p className="mt-3 text-text-body">
                <BoldCopy
                  value={item.body}
                  multiline
                  placeholder={chromeText(chrome, "phContent", "내용")}
                  onCommit={edit ? (value) => setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, body: value } : row))) : undefined}
                />
              </p>
              {edit ? (
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <label className="cursor-pointer font-medium text-primary">
                    {item.imageUrl ? chromeText(chrome, "mediaReplace", "사진 바꾸기") : chromeText(chrome, "phPhoto", "사진 추가")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void edit.upload(file).then((url) => {
                          setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, imageUrl: url } : row)));
                        }).catch(() => undefined);
                      }}
                    />
                  </label>
                  {items.length > 1 ? <EditRemoveX onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} /> : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        </div>
      </div>
      )}
      {edit && pickIndex !== null && items[pickIndex] ? (
        <IconPickerModal
          eyebrow="PREMIUM ICON"
          value={items[pickIndex].icon}
          onPick={(icon) => setItems(items.map((row, itemIndex) => (itemIndex === pickIndex ? { ...row, icon } : row)))}
          onClose={() => setPickIndex(null)}
        />
      ) : null}
      {edit && items.length < PREMIUM_ITEM_MAX ? (
        <button
          type="button"
          className="mt-4 text-sm font-medium text-primary"
          onClick={() => setItems([...items, { icon: PREMIUM_ICONS[items.length % PREMIUM_ICONS.length] ?? "ocean-view-residence", title: chromeText(chrome, "seedPremiumTitle", "특장점"), body: chromeText(chrome, "seedPremiumBody", "내용을 입력하세요."), imageUrl: "" }])}
        >
          {chromeText(chrome, "editAddItem", "항목 추가")}
        </button>
      ) : null}
      {photo !== null && slides.length > 0 ? <PhotoViewer images={slides} index={Math.max(0, photo)} onIndex={setPhoto} onClose={() => setPhoto(null)} /> : null}
    </div>
  );
}

function ContactDock({ snapshot, live, compact }: { snapshot: PageSnapshot; live: boolean; compact: boolean }) {
  const chrome = useEditorChrome();
  const [open, setOpen] = useState(false);
  const [covered, setCovered] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const phone = snapshot.phone.trim();
  const hero = snapshot.sections.find((section) => section.sectionType === "hero");
  const leadSection = snapshot.sections.find((section) => section.sectionType === "lead_form");
  const legalSection = snapshot.sections.find((section) => section.sectionType === "legal");
  // 히어로·관심고객 등록·푸터 구간이 화면에 보이는 동안에는 고정 문의 버튼을 숨겨 CTA와 겹치지 않게 한다.
  const coverKey = [hero?.anchorId, leadSection?.anchorId, legalSection?.anchorId].filter(Boolean).join("|");
  const cta = String(hero?.content.ctaLabel ?? snapshot.globalSettings.ctaLabel ?? "").trim() || chromeText(chrome, "phCta", "관심고객 등록");
  const dockLabel = String(hero?.content.dockLabel ?? "").trim() || chromeText(chrome, "phDock", "분양문의");
  const dockCloseLabel = String(hero?.content.dockCloseLabel ?? "").trim() || chromeText(chrome, "shellPopupClosePh", "닫기");
  const phoneLabel = String(hero?.content.headerPhoneLabel ?? "").trim() || chromeText(chrome, "phPhoneCaption", "문의번호");
  const [compactSeen, setCompactSeen] = useState(compact);
  if (compactSeen !== compact) {
    setCompactSeen(compact);
    if (!compact) setOpen(false);
  }
  useEffect(() => {
    if (!compact || !open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compact, open]);
  useEffect(() => {
    const node = dockRef.current;
    const page = node?.closest(".presale-foreon, .midday-landing");
    if (!node || !page || typeof IntersectionObserver === "undefined") return;
    const targets = coverKey
      .split("|")
      .filter(Boolean)
      .map((anchorId) => page.querySelector(`[id="${CSS.escape(anchorId)}"]`))
      .filter((target): target is Element => Boolean(target));
    if (targets.length === 0) {
      setCovered(false);
      return;
    }
    const hits = new Set<Element>();
    const scroller = page.closest("[data-preview-scroll]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) hits.add(entry.target);
          else hits.delete(entry.target);
        }
        setCovered(hits.size > 0);
      },
      { root: scroller instanceof HTMLElement ? scroller : null },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [coverKey]);
  const inquiryAnchor = leadInquiryAnchor(snapshot);
  const inquiryHref = `#${inquiryAnchor}`;
  const register = live && externalFormUrl(snapshot) ? (
    <TrackedLink href={externalFormUrl(snapshot)} target="_blank" slug={snapshot.publicSlug} eventName="lead_cta_click" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white">
      {cta}
    </TrackedLink>
  ) : live ? (
    <TrackedLink href={inquiryHref} slug={snapshot.publicSlug} eventName="lead_cta_click" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white">
      {cta}
    </TrackedLink>
  ) : (
    <a
      href={inquiryHref}
      className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white"
      onClick={(event) => {
        event.preventDefault();
        scrollToAnchor(inquiryAnchor, event.currentTarget);
      }}
    >
      {cta}
    </a>
  );
  return (
    <>
      {compact && open && !covered ? (
        <button type="button" className="fixed inset-0 z-30 bg-text-primary/40" aria-label={chromeText(chrome, "ariaDockClose", "문의 닫기")} onClick={() => setOpen(false)} />
      ) : null}
      <div ref={dockRef} className="pf-dock-slot pointer-events-none sticky z-40 h-0">
        <div
          className={cn(
            "pf-dock-panel pointer-events-none absolute right-3 flex flex-col items-end gap-2 transition-opacity sm:right-6",
            covered && "invisible opacity-0",
          )}
          aria-hidden={covered || undefined}
        >
          {compact && !open ? (
            <button type="button" className="pointer-events-auto inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white shadow-lg" aria-expanded={false} onClick={() => setOpen(true)}>
              {dockLabel}
            </button>
          ) : (
            <div className="pf-dock pointer-events-auto flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-end gap-2 rounded-[16px] border border-border p-2">
              {phone ? (
                <div className="px-2 text-right leading-tight">
                  <p className="text-xs text-text-muted">{phoneLabel}</p>
                  {live && phoneHref(phone) ? (
                    <TrackedLink href={phoneHref(phone)} slug={snapshot.publicSlug} eventName="phone_click" className="text-sm font-semibold text-text-primary">
                      {phone}
                    </TrackedLink>
                  ) : (
                    <p className="text-sm font-semibold text-text-primary">{phone}</p>
                  )}
                </div>
              ) : null}
              {register}
              {compact ? (
                <button type="button" className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-[14px] px-2 text-sm text-text-muted" onClick={() => setOpen(false)}>
                  {dockCloseLabel}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function popupHiddenToday(slug: string) {
  const raw = window.localStorage.getItem(`adone-popup-day-${slug}`);
  if (!raw) return false;
  return Number(raw) > Date.now();
}

function hidePopupForToday(slug: string) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  window.localStorage.setItem(`adone-popup-day-${slug}`, String(end.getTime()));
}

/** 공개 페이지에서 팝업이 뜨기까지 기다리는 시간(ms) */
const POPUP_OPEN_DELAY_MS = 600;

type VisitPopupCopy = {
  enabled?: boolean;
  banner?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  perks?: string[];
  disclaimer?: string;
  phone?: string;
  phonePrefix?: string;
  hideTodayLabel?: string;
  closeLabel?: string;
  emptyImageLabel?: string;
};

/**
 * 방문 팝업. 편집 도구(인라인 편집·순서 버튼)는 넣지 않는다.
 * 문구·이미지는 왼쪽 패널의 「이벤트 팝업」 설정에서 고치고, forced(설정 미리보기)에서는 실제 화면 그대로 보여 준다.
 */
function VisitPopup({
  snapshot,
  forced = false,
  live = false,
  layout = "desktop",
  onClose,
  onReturnToSettings,
}: {
  snapshot: PageSnapshot;
  forced?: boolean;
  live?: boolean;
  layout?: ViewLayout;
  onClose?: () => void;
  onReturnToSettings?: () => void;
}) {
  const chrome = useEditorChrome();
  const popup = (snapshot.globalSettings.popup ?? {}) as VisitPopupCopy;
  const enabled = isPopupEnabled(popup);
  const form = leadFormSection(snapshot);
  const [open, setOpen] = useState(forced);
  const [hideToday, setHideToday] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const perks = (popup.perks ?? []).slice(0, POPUP_PERK_MAX).map((item) => item.trim()).filter(Boolean);
  const phone = (popup.phone || snapshot.phone).trim();
  const hero = snapshot.sections.find((section) => section.sectionType === "hero");
  const cta =
    String(popup.ctaLabel ?? hero?.content.ctaLabel ?? snapshot.globalSettings.ctaLabel ?? "").trim() ||
    chromeText(chrome, "phCta", "관심고객 등록");
  useEffect(() => {
    if (forced || !enabled) return;
    if (popupHiddenToday(snapshot.publicSlug)) return;
    const timer = window.setTimeout(() => setOpen(true), POPUP_OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [forced, enabled, snapshot.publicSlug]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
  function close() {
    if (!forced && hideToday) hidePopupForToday(snapshot.publicSlug);
    setOpen(false);
    onClose?.();
  }
  useDialogFocusTrap({
    open: open && Boolean(form),
    panelRef,
    initialFocusRef: closeRef,
    onEscape: close,
  });
  if (!open || !form) return null;
  function register(from: HTMLElement) {
    const url = externalFormUrl(snapshot);
    close();
    if (live && url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    window.setTimeout(() => scrollToAnchor(form?.anchorId || "inquiry", from), 0);
  }
  const bannerAlt =
    String(popup.banner ?? "").trim() ||
    String(popup.title ?? "").trim() ||
    chromeText(chrome, "shellPopupEmptyPh", "배너 이미지");
  const closeLabel = String(popup.closeLabel ?? "").trim() || chromeText(chrome, "shellPopupClosePh", "닫기");
  const title = popup.title || chromeText(chrome, "shellPopupTitlePh", "관심고객으로 등록해 주세요");
  const phonePopup = layout === "mobile";
  return (
    <div className={cn("fixed inset-0 z-50 flex justify-center overflow-hidden bg-black/60", phonePopup ? "items-end p-3" : "items-center p-4")} onClick={close}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-popup-title"
        className={cn("flex w-full max-w-[23.8rem] max-h-[min(92dvh,40rem)] flex-col overflow-hidden rounded-[16px] border border-border bg-white [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden", phonePopup ? "my-3" : "my-6")}
        onClick={(event) => event.stopPropagation()}
      >
        {forced && onReturnToSettings ? (
          <div className="border-b border-border bg-surface px-4 py-2">
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 rounded-[14px] border border-border bg-white px-4 text-sm font-semibold"
              onClick={() => {
                setOpen(false);
                onReturnToSettings();
              }}
            >
              <span aria-hidden>←</span>
              {chromeText(chrome, "shellPopupReturn", "설정으로 돌아가기")}
            </button>
          </div>
        ) : null}
        <div className="relative">
          {popup.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={popup.imageUrl} alt={bannerAlt} className={cn("w-full object-cover", phonePopup ? "aspect-[16/10] max-h-[min(36vh,280px)]" : "aspect-square max-h-[min(42vh,360px)]")} />
          ) : (
            <div className="flex h-24 items-center justify-center bg-primary-soft px-4 text-center text-sm text-primary">
              {String(popup.emptyImageLabel ?? "").trim() || chromeText(chrome, "shellPopupEmptyPh", "배너 이미지")}
            </div>
          )}
          <button
            ref={closeRef}
            type="button"
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white"
            onClick={close}
            aria-label={closeLabel}
          >
            <span aria-hidden className="text-lg leading-none">×</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {popup.banner?.trim() ? <p className="text-sm font-semibold text-primary">{popup.banner}</p> : null}
          <h2 id="visit-popup-title" className="mt-2 whitespace-pre-wrap text-[1.35rem] font-medium leading-snug break-keep">
            <MarkedText text={title} />
          </h2>
          {popup.body?.trim() ? (
            <p className="mt-3 whitespace-pre-wrap text-text-body">
              <MarkedText text={popup.body} />
            </p>
          ) : null}
          {perks.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {perks.map((perk, index) => (
                <li key={`popup-perk-${index}`} className="flex items-start gap-2 text-sm text-text-body">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">✓</span>
                  <MarkedText text={perk} />
                </li>
              ))}
            </ul>
          ) : null}
          {popup.disclaimer?.trim() ? (
            <p className="mt-4 text-xs text-text-muted">
              <MarkedText text={popup.disclaimer} />
            </p>
          ) : null}
          <button
            type="button"
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-primary text-[17px] font-semibold text-white"
            onClick={(event) => register(event.currentTarget)}
          >
            {cta}
          </button>
          {phone ? (
            <p className="mt-3 text-center text-sm text-text-body">
              {String(popup.phonePrefix ?? "").trim() || chromeText(chrome, "shellPopupPhonePrefixPh", "바로 상담")}{" "}
              {live && phoneHref(phone) ? (
                <a href={phoneHref(phone)} className="font-semibold text-primary">{phone}</a>
              ) : (
                <span className="font-semibold">{phone}</span>
              )}
            </p>
          ) : null}
          <label className="mt-4 flex items-center gap-2 text-sm text-text-body">
            <input type="checkbox" checked={hideToday} onChange={(event) => setHideToday(event.target.checked)} />
            {popup.hideTodayLabel?.trim() || chromeText(chrome, "shellPopupHideTodayPh", "오늘 하루 보지 않기")}
          </label>
        </div>
      </div>
    </div>
  );
}
function PhotoViewer({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: Array<{ url: string; alt?: string; caption?: string }>;
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const labels = useContext(ViewerLabelsContext);
  const edit = useCanvasEdit();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const current = images[index];
  const caption = imageDisplayCaption(current);
  const alt = imageAltText(current, "사진");
  function viewerWord(key: "prev" | "next" | "close", fallback: string) {
    const stored = labels[key];
    if (!edit) return stored.trim() || fallback;
    const field = key === "prev" ? "viewerPrev" : key === "next" ? "viewerNext" : "viewerClose";
    return <InlineText value={stored} placeholder={fallback} onCommit={(value) => edit.setPageCopy({ [field]: value })} />;
  }
  useDialogFocusTrap({
    open: Boolean(current),
    panelRef,
    initialFocusRef: closeRef,
    onEscape: onClose,
  });
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") onIndex((index + 1) % images.length);
      if (event.key === "ArrowLeft") onIndex((index - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, index, onIndex]);
  if (!current) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/80 p-4" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={alt || "사진 보기"}
        className="w-full max-w-4xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={alt} className="max-h-[70vh] w-full rounded-[16px] bg-white object-contain" />
        {caption ? <p className="mt-3 text-center text-sm text-white">{caption}</p> : null}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {images.length > 1 ? (
            <button
              type="button"
              className="inline-flex h-12 items-center rounded-[14px] bg-white px-5 text-sm font-semibold"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
                onIndex((index - 1 + images.length) % images.length);
              }}
            >
              {viewerWord("prev", "이전")}
            </button>
          ) : null}
          {images.length > 1 ? (
            <button
              type="button"
              className="inline-flex h-12 items-center rounded-[14px] bg-white px-5 text-sm font-semibold"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
                onIndex((index + 1) % images.length);
              }}
            >
              {viewerWord("next", "다음")}
            </button>
          ) : null}
          <button
            ref={closeRef}
            type="button"
            className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
              onClose();
            }}
          >
            <span className="text-white">{viewerWord("close", "닫기")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ThumbGallery({
  images,
  onCommit,
  upload,
  representative = false,
  captionOnImage = false,
  badgeLabel = "",
  onBadgeCommit,
  emptyLabel = "",
  onEmptyCommit,
}: {
  images: Array<{ url?: string; alt?: string; caption?: string }>;
  onCommit?: (images: Array<{ url?: string; alt?: string; caption?: string }>) => void;
  upload?: (file: File) => Promise<string | null>;
  representative?: boolean;
  captionOnImage?: boolean;
  badgeLabel?: string;
  onBadgeCommit?: (value: string) => void;
  emptyLabel?: string;
  onEmptyCommit?: (value: string) => void;
}) {
  const chrome = useEditorChrome();
  const slides = images.filter((image): image is { url: string; alt?: string; caption?: string } => Boolean(image.url));
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const safe = slides.length > 0 ? Math.min(index, slides.length - 1) : 0;
  const current = slides[safe];
  const currentCaption = imageDisplayCaption(current);
  function write(next: Array<{ url?: string; alt?: string; caption?: string }>) {
    onCommit?.(next.slice(0, GALLERY_IMAGE_MAX));
  }
  return (
    <div>
      {current ? (
        <div className="relative">
          {onCommit ? (
            <EditableImage
              src={current.url}
              alt={imageAltText(current)}
              className="rounded-[16px] border border-border bg-white"
              imageClassName="max-h-[32rem] w-full object-contain"
              onUpload={(url) => write(slides.map((row, rowIndex) => (rowIndex === safe ? { ...row, url } : row)))}
            />
          ) : (
            <button type="button" className="block w-full" onClick={() => setViewer(safe)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.url} alt={imageAltText(current)} className="max-h-[32rem] w-full rounded-[16px] border border-border bg-white object-contain" />
            </button>
          )}
          {representative && safe === 0 ? (
            <span className="absolute left-3 top-3 rounded-[8px] bg-primary px-2 py-1 text-xs font-semibold text-white">
              {onBadgeCommit ? (
                <InlineText value={badgeLabel} placeholder={chromeText(chrome, "phBadgeMain", "대표")} className="text-white" onCommit={onBadgeCommit} />
              ) : (
                badgeLabel.trim() || chromeText(chrome, "phBadgeMain", "대표")
              )}
            </span>
          ) : null}
          {slides.length > 1 ? (
            <span className={`pf-media-chip absolute right-3 ${captionOnImage ? "top-3" : "bottom-3"}`}>{safe + 1} / {slides.length}</span>
          ) : null}
          {captionOnImage && current && (onCommit || currentCaption) ? (
            <p className="absolute inset-x-0 bottom-0 rounded-b-[16px] bg-text-primary/70 px-4 py-3 text-sm text-white">
              <InlineText
                value={currentCaption}
                placeholder={chromeText(chrome, "phPhotoCaption", "사진 설명")}
                onCommit={
                  onCommit
                    ? (value) => write(slides.map((row, rowIndex) => (rowIndex === safe ? { ...row, caption: value } : row)))
                    : undefined
                }
              />
            </p>
          ) : null}
        </div>
      ) : onCommit ? (
        <EditableImage
          alt=""
          className="rounded-[16px] border border-border bg-white"
          imageClassName="max-h-[32rem] w-full object-contain"
          emptyClassName="flex h-64 items-center justify-center"
          emptyLabel={
            onEmptyCommit ? (
              <InlineText value={emptyLabel} placeholder={chromeText(chrome, "phImageEmpty", "이미지")} onCommit={onEmptyCommit} />
            ) : (
              emptyLabel.trim() || chromeText(chrome, "phImageEmpty", "이미지")
            )
          }
          onUpload={(url) => write([...slides, { url, alt: "", caption: "" }])}
        />
      ) : null}
      {current && !captionOnImage && (onCommit || currentCaption) ? (
        <p className="mt-3 text-sm text-text-body">
          <InlineText
            value={currentCaption}
            placeholder={chromeText(chrome, "phPhotoCaption", "사진 설명")}
            onCommit={
              onCommit
                ? (value) => write(slides.map((row, rowIndex) => (rowIndex === safe ? { ...row, caption: value } : row)))
                : undefined
            }
          />
        </p>
      ) : null}
      {slides.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {slides.map((image, imageIndex) => (
            <button
              key={`${image.url}-${imageIndex}`}
              type="button"
              className={cn("h-16 w-24 shrink-0 overflow-hidden rounded-[8px] border", imageIndex === safe ? "border-primary" : "border-border")}
              onClick={() => setIndex(imageIndex)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
      {onCommit ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {current && upload ? (
            <label className="cursor-pointer font-medium text-primary">
              {chromeText(chrome, "mediaReplace", "사진 바꾸기")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file || !current) return;
                  void upload(file).then((url) => {
                    if (!url) return;
                    write(slides.map((row, rowIndex) => (rowIndex === safe ? { ...row, url } : row)));
                  }).catch(() => undefined);
                }}
              />
            </label>
          ) : null}
          {slides.length < GALLERY_IMAGE_MAX && upload ? (
            <label className="cursor-pointer font-medium text-primary">
              {chromeText(chrome, "mediaAddImage", "이미지 추가")}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  if (!files.length) return;
                  void (async () => {
                    const added: Array<{ url: string; alt: string; caption: string }> = [];
                    for (const file of files) {
                      if (slides.length + added.length >= GALLERY_IMAGE_MAX) break;
                      try {
                        const url = await upload(file);
                        if (url) added.push({ url, alt: "", caption: "" });
                      } catch {
                        break;
                      }
                    }
                    if (added.length) {
                      write([...slides, ...added]);
                      setIndex(slides.length);
                    }
                  })();
                }}
              />
            </label>
          ) : null}
          {current ? (
            <EditRemoveX
              onClick={() => {
                write(slides.filter((_, rowIndex) => rowIndex !== safe));
                setIndex(Math.max(0, safe - 1));
              }}
            />
          ) : null}
        </div>
      ) : null}
      {viewer !== null && slides.length > 0 ? (
        <PhotoViewer images={slides.map((slide) => ({ url: slide.url, alt: slide.alt }))} index={Math.max(0, viewer)} onIndex={setViewer} onClose={() => setViewer(null)} />
      ) : null}
    </div>
  );
}

function Gallery({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const images = edit ? sectionGallerySlots(section.content.images) : sectionGalleryImages(section.content.images);
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <SectionEyebrow section={section} />
        <h2 className="mt-2 text-3xl font-medium whitespace-pre-wrap break-keep">
          <InlineText value={String(section.content.heading ?? section.title)} multiline onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
        </h2>
        {(edit || String(section.content.body ?? "").trim()) ? (
          <p className="mt-4 max-w-3xl text-text-body">
            <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
          </p>
        ) : null}
        <div className="mt-8">
          <ThumbGallery
            images={images}
            representative
            badgeLabel={String(section.content.representativeLabel ?? "")}
            onBadgeCommit={edit ? (value) => edit.patch(section.id, { ...section.content, representativeLabel: value }) : undefined}
            emptyLabel={String(section.content.emptyImageLabel ?? "")}
            onEmptyCommit={edit ? (value) => edit.patch(section.id, { ...section.content, emptyImageLabel: value }) : undefined}
            upload={edit?.upload}
            onCommit={edit ? (next) => edit.patch(section.id, { ...section.content, images: next }) : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function Floorplan({ section, layout }: { section: PageSection; layout: ViewLayout }) {
  const narrow = layout !== "desktop";
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const types = (
    (section.content.types as Array<{
      name: string;
      tabLabel?: string;
      summary: string;
      imageUrl?: string;
      images?: FloorplanImage[];
      activeImageIndex?: number;
      specs?: Array<{ label: string; value: string }>;
      exclusiveArea?: string;
      supplyArea?: string;
      rooms?: string;
    }>) ?? []
  ).slice(0, FLOORPLAN_TYPE_MAX);
  const storedIndex = Math.min(Math.max(Number(section.content.activeTypeIndex ?? 0) || 0, 0), Math.max(0, types.length - 1));
  const [viewIndex, setViewIndex] = useState(storedIndex);
  const [viewIndexSource, setViewIndexSource] = useState(storedIndex);
  const [plan, setPlan] = useState<number | null>(null);
  const [localImage, setLocalImage] = useState(0);
  const [localImageSource, setLocalImageSource] = useState(`${storedIndex}:0`);
  if (viewIndexSource !== storedIndex) {
    setViewIndexSource(storedIndex);
    setViewIndex(storedIndex);
  }
  const activeIndex = edit ? storedIndex : viewIndex;
  const type = types[activeIndex];
  const images = type ? floorplanImages(type, chrome) : [];
  const storedImage = images.length > 0 ? Math.min(type?.activeImageIndex ?? 0, images.length - 1) : 0;
  const imageSourceKey = `${activeIndex}:${storedImage}`;
  if (localImageSource !== imageSourceKey) {
    setLocalImageSource(imageSourceKey);
    setLocalImage(storedImage);
  }
  const imageIndex = edit ? storedImage : Math.min(localImage, Math.max(0, images.length - 1));
  function setTypes(next: typeof types, nextActive = activeIndex) {
    edit?.patch(section.id, {
      ...section.content,
      types: next,
      activeTypeIndex: Math.min(Math.max(nextActive, 0), Math.max(0, next.length - 1)),
    });
  }
  function selectType(index: number) {
    if (!edit) {
      setViewIndex(index);
      return;
    }
    setTypes(types, index);
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-20" data-section-skin="floorplan">
      <SectionEyebrow section={section} />
      <h2 className={sectionTitleClass(layout)}>
        <InlineText value={String(section.content.heading ?? section.title)} multiline onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
      </h2>
      {(edit || String(section.content.body ?? "").trim()) ? (
      <p className="mt-4 max-w-3xl text-text-body">
        <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
      </p>
      ) : null}
      <div className="mt-8 flex flex-nowrap items-end gap-1 overflow-x-auto overscroll-x-contain border-b border-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
        {types.map((item, index) => (
          <div key={`${section.id}-tab-${index}`} className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              className={cn(
                "-mb-px inline-flex h-12 shrink-0 items-center whitespace-nowrap border-b-[3px] px-5 text-base font-semibold transition-colors",
                index === activeIndex ? "border-primary text-text-primary" : "border-transparent text-text-muted hover:text-text-primary",
              )}
              onClick={() => selectType(index)}
            >
              {edit ? (
                <InlineText
                  value={floorplanTabLabel(item, chromeText(chrome, "phTypeFallback", "타입 {n}").replace("{n}", String(index + 1)))}
                  placeholder={chromeText(chrome, "phUnitType", "타입")}
                  onCommit={(value) =>
                    setTypes(types.map((row, itemIndex) => (itemIndex === index ? { ...row, name: value, tabLabel: value } : row)))
                  }
                />
              ) : (
                floorplanTabLabel(item, chromeText(chrome, "phTypeFallback", "타입 {n}").replace("{n}", String(index + 1)))
              )}
            </button>
            {edit && types.length > 1 ? (
              <EditRemoveX
                onClick={() => setTypes(types.filter((_, itemIndex) => itemIndex !== index), index === activeIndex ? 0 : activeIndex > index ? activeIndex - 1 : activeIndex)}
              />
            ) : null}
          </div>
        ))}
        {edit && types.length < FLOORPLAN_TYPE_MAX ? (
          <button
            type="button"
            className="inline-flex h-12 shrink-0 items-center whitespace-nowrap px-4 text-sm font-semibold text-primary"
            onClick={() => setTypes([...types, { name: chromeText(chrome, "seedTypeName", "타입"), summary: chromeText(chrome, "seedTypeSummary", "설명을 입력하세요.") }], types.length)}
          >
            {chromeText(chrome, "editAddType", "타입 추가")}
          </button>
        ) : null}
      </div>
      {type ? (
        <div className={cn("mt-6 grid gap-6", layoutCols(layout, "lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]", "grid-cols-[minmax(0,1.3fr)_minmax(14rem,0.85fr)]"))}>
          <div>
            {images[imageIndex] ? (
              <>
              <div className="relative rounded-[12px] border border-border bg-surface p-3">
              {edit ? (
                <EditableImage
                  src={images[imageIndex].url}
                  alt={imageAltText(images[imageIndex], type.name)}
                  imageClassName="max-h-[28rem] w-full object-contain"
                  onUpload={(url) => {
                    const nextImages = images.map((image, index) => (index === imageIndex ? { ...image, url } : image));
                    setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, nextImages, imageIndex) : row)));
                  }}
                />
              ) : (
                <button type="button" className="block w-full" onClick={() => setPlan(imageIndex)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[imageIndex].url} alt={imageAltText(images[imageIndex], type.name)} className="max-h-[28rem] w-full object-contain" />
                </button>
              )}
              {images.length > 1 ? <span className="pf-media-chip absolute bottom-3 right-3">{imageIndex + 1} / {images.length}</span> : null}
              </div>
              {(edit || imageDisplayCaption(images[imageIndex])) ? (
                <p className="mt-2 text-sm text-text-body">
                  <InlineText
                    value={imageDisplayCaption(images[imageIndex])}
                    placeholder={chromeText(chrome, "phPhotoCaption", "사진 설명")}
                    onCommit={edit ? (value) => setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, images.map((image, index) => (index === imageIndex ? { ...image, caption: value } : image)), imageIndex) : row))) : undefined}
                  />
                </p>
              ) : null}
              </>
            ) : edit ? (
              <EditableImage
                alt=""
                className="rounded-[12px]"
                imageClassName="max-h-[28rem] w-full object-contain"
                emptyClassName="flex h-64 items-center justify-center"
                emptyLabel={<InlineText value={String(section.content.emptyImageLabel ?? "")} placeholder={chromeText(chrome, "phPlanEmpty", "평면 이미지")} onCommit={textCommit(section, "emptyImageLabel", edit)} />}
                onUpload={(url) => {
                  const nextImages = [...images, { url, alt: "", caption: "" }].slice(0, GALLERY_IMAGE_MAX);
                  setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, nextImages, nextImages.length - 1) : row)));
                }}
              />
            ) : null}
            {images.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={`${image.url}-${index}`}
                    type="button"
                    className={cn("h-16 w-20 shrink-0 overflow-hidden rounded-[8px] border", index === imageIndex ? "border-primary" : "border-border")}
                    onClick={() => {
                      if (edit) setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, images, index) : row)));
                      else setLocalImage(index);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={imageAltText(image)} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            {edit ? (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {images.length < GALLERY_IMAGE_MAX ? (
                <label className="cursor-pointer font-medium text-primary">
                  {chromeText(chrome, "mediaPlanAdd", "평면 이미지 추가")}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      if (!files.length || !edit) return;
                      void (async () => {
                        const added: FloorplanImage[] = [];
                        for (const file of files) {
                          if (images.length + added.length >= GALLERY_IMAGE_MAX) break;
                          try {
                            const url = await edit.upload(file);
                            if (url) added.push({ url, alt: "", caption: "" });
                          } catch {
                            break;
                          }
                        }
                        if (added.length) {
                          const nextImages = [...images, ...added].slice(0, GALLERY_IMAGE_MAX);
                          setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, nextImages, nextImages.length - 1) : row)));
                        }
                      })();
                    }}
                  />
                </label>
                ) : null}
                {images[imageIndex] ? (
                  <label className="cursor-pointer font-medium text-primary">
                    {chromeText(chrome, "mediaPlanReplace", "이 평면 바꾸기")}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        void edit.upload(file).then((url) => {
                          if (!url) return;
                          const nextImages = images.map((image, index) => (index === imageIndex ? { ...image, url } : image));
                          setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, nextImages, imageIndex) : row)));
                        }).catch(() => undefined);
                      }}
                    />
                  </label>
                ) : null}

                {images.length > 0 ? (
                  <EditRemoveX
                    onClick={() => {
                      const nextImages = images.filter((_, index) => index !== imageIndex);
                      setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, nextImages, Math.max(0, imageIndex - 1)) : row)));
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="rounded-[16px] border border-border p-6">
            <h3 className="text-2xl font-semibold tracking-tight break-keep">
              <InlineText
                value={type.name}
                placeholder={chromeText(chrome, "phUnitType", "타입")}
                onCommit={edit ? (value) => setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? { ...row, name: value } : row))) : undefined}
              />
            </h3>
            {(edit || type.summary.trim()) ? (
            <p className="mt-2 text-text-body">
              <BoldCopy
                value={type.summary}
                multiline
                placeholder={chromeText(chrome, "phBody", "설명")}
                onCommit={edit ? (value) => setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? { ...row, summary: value } : row))) : undefined}
              />
            </p>
            ) : null}
            <dl className="mt-4 space-y-2 text-sm">
              {floorplanSpecs(type, chrome).map((spec, specIndex) =>
                edit || spec.value.trim() ? (
                  <div key={`${spec.label}-${specIndex}`} className="flex items-start gap-3 border-b border-border py-2">
                    <dt className="w-16 shrink-0 text-text-muted">
                      <InlineText
                        value={spec.label}
                        placeholder={chromeText(chrome, "phItem", "항목")}
                        onCommit={
                          edit
                            ? (value) =>
                                setTypes(
                                  types.map((row, itemIndex) =>
                                    itemIndex === activeIndex
                                      ? withFloorplanSpecs(row, floorplanSpecs(row, chrome).map((item, i) => (i === specIndex ? { ...item, label: value } : item)), chrome)
                                      : row,
                                  ),
                                )
                            : undefined
                        }
                      />
                    </dt>
                    <dd className="min-w-0 flex-1">
                      <InlineText
                        value={spec.value}
                        placeholder={chromeText(chrome, "phContent", "내용")}
                        onCommit={
                          edit
                            ? (value) =>
                                setTypes(
                                  types.map((row, itemIndex) =>
                                    itemIndex === activeIndex
                                      ? withFloorplanSpecs(row, floorplanSpecs(row, chrome).map((item, i) => (i === specIndex ? { ...item, value } : item)), chrome)
                                      : row,
                                  ),
                                )
                            : undefined
                        }
                      />
                    </dd>
                    {edit && floorplanSpecs(type, chrome).length > 1 ? (
                      <EditRemoveX
                        onClick={() =>
                          setTypes(
                            types.map((row, itemIndex) =>
                              itemIndex === activeIndex ? withFloorplanSpecs(row, floorplanSpecs(row, chrome).filter((_, i) => i !== specIndex), chrome) : row,
                            ),
                          )
                        }
                      />
                    ) : null}
                  </div>
                ) : null,
              )}
            </dl>
            {edit && floorplanSpecs(type, chrome).length < FLOORPLAN_SPEC_MAX ? (
              <button
                type="button"
                className="mt-3 text-sm font-medium text-primary"
                onClick={() =>
                  setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanSpecs(row, [...floorplanSpecs(row, chrome), { label: chromeText(chrome, "seedFactLabel", "항목"), value: "" }], chrome) : row)))
                }
              >
                {chromeText(chrome, "editAddItem", "항목 추가")}
              </button>
            ) : null}
            {(edit || String(section.content.disclaimer ?? "").trim()) ? (
              <p className="mt-4 text-xs leading-relaxed text-text-muted">
                <BoldCopy value={String(section.content.disclaimer ?? "")} multiline onCommit={textCommit(section, "disclaimer", edit)} placeholder={chromeText(chrome, "phFloorDisclaimer", "※ 평면도 안내 문구")} />
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {plan !== null && images.length > 0 ? (
        <PhotoViewer images={images.map((image) => ({ url: image.url, alt: image.alt || type?.name || String(section.content.planAlt ?? "").trim() || chromeText(chrome, "phPlanAlt", "평면") }))} index={Math.max(0, plan)} onIndex={setPlan} onClose={() => setPlan(null)} />
      ) : null}
    </div>
  );
}

function safeMapUrl(value: string) {
  return httpUrl(value);
}

function Directions({ section, sitePhone, layout, snapshot }: { section: PageSection; sitePhone: string; layout: ViewLayout; snapshot: PageSnapshot }) {
  const narrow = layout !== "desktop";
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const [copied, setCopied] = useState<"ok" | "fail" | "">("");
  const mapImageUrl = String(section.content.mapImageUrl ?? "");
  const rawMapUrl = String(section.content.mapUrl ?? "");
  const mapUrl = safeMapUrl(rawMapUrl);
  const address = String(section.content.address ?? "");
  const placeName = String(section.content.placeName ?? "");
  const localPhone = String(section.content.phone ?? "");
  const phone = localPhone.trim() || sitePhone;
  const routes = directionsRoutes(section.content.routes);
  const [mapOpen, setMapOpen] = useState(false);
  const mapFrame = layout === "desktop" ? "h-[560px] min-h-[520px]" : "h-[360px] min-h-[360px]";
  const mapPicture = mapImageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mapImageUrl} alt={String(section.content.mapAlt ?? "").trim() || chromeText(chrome, "phMapAlt", "약도")} className={cn(mapFrame, "w-full object-cover")} />
  ) : (
    <div className={cn(mapFrame, "flex items-center justify-center bg-surface px-4 text-center text-sm text-text-muted")}>
      {edit ? (
        <InlineText value={String(section.content.mapEmptyLabel ?? "")} placeholder={chromeText(chrome, "phMapEmpty", "약도 이미지")} onCommit={textCommit(section, "mapEmptyLabel", edit)} />
      ) : (
        String(section.content.mapEmptyLabel ?? "").trim() || chromeText(chrome, "phMapEmpty", "약도 이미지")
      )}
    </div>
  );
  function rowName(key: string, chromeKey: string, fallback: string) {
    const value = String(section.content[key] ?? "");
    const shown = chromeText(chrome, chromeKey, fallback);
    if (!edit) return value.trim() || shown;
    return <InlineText value={value} placeholder={shown} onCommit={textCommit(section, key, edit)} />;
  }
  function setRoutes(next: Array<{ label: string; detail: string }>) {
    edit?.patch(section.id, { ...section.content, routes: directionsRoutes(next) });
  }
  async function copyAddress() {
    const text = address.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    window.setTimeout(() => setCopied(""), 1500);
  }
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <SectionEyebrow section={section} />
        <h2 className={sectionTitleClass(layout)}>
          <InlineText
            value={String(section.content.heading ?? section.title)}
            multiline
            onCommit={textCommit(section, "heading", edit)}
            placeholder={chromeText(chrome, "phDirections", "오시는 길")}
          />
        </h2>
        {(edit || String(section.content.placeLabel ?? "").trim()) ? (
          <p className="mt-3 text-[11px] font-semibold tracking-[0.14em] text-primary">
            <InlineText
              value={String(section.content.placeLabel ?? "")}
              placeholder={chromeText(chrome, "phPlaceLabel", "견본주택")}
              onCommit={textCommit(section, "placeLabel", edit)}
            />
          </p>
        ) : null}
        {(edit || placeName.trim()) ? (
          <p className="mt-2 text-xl font-semibold text-text-primary break-keep">
            <InlineText value={placeName} placeholder={chromeText(chrome, "phPlace", "장소")} onCommit={textCommit(section, "placeName", edit)} />
          </p>
        ) : null}
        {(edit || String(section.content.body ?? "").trim()) ? (
          <p className="mt-4 max-w-3xl text-text-body">
            <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
          </p>
        ) : null}
        <div className={cn("mt-8 grid gap-6", (edit || mapImageUrl || mapUrl) && layoutCols(layout, "lg:grid-cols-2"))}>
          <div>
            {(edit || address.trim() || phone.trim() || String(section.content.hours ?? "").trim() || String(section.content.parking ?? "").trim()) ? (
            <dl className="overflow-hidden rounded-[16px] border border-border bg-white">
              {(edit || address.trim()) ? (
                <div className={cn("border-b border-border last:border-b-0", narrow ? "grid grid-cols-1" : "grid grid-cols-[auto_1fr]")}>
                  <dt className="bg-surface px-4 py-3 text-sm text-text-muted">{rowName("addressLabel", "phRowAddress", "주소")}</dt>
                  <dd className="min-w-0 px-4 py-3 font-medium break-keep">
                    <InlineText value={address} onCommit={textCommit(section, "address", edit)} placeholder={chromeText(chrome, "phAddress", "주소")} />
                  </dd>
                </div>
              ) : null}
              {(edit || phone.trim()) ? (
                <div className={cn("border-b border-border last:border-b-0", narrow ? "grid grid-cols-1" : "grid grid-cols-[auto_1fr]")}>
                  <dt className="bg-surface px-4 py-3 text-sm text-text-muted">{rowName("phoneRowLabel", "phRowPhone", "전화")}</dt>
                  <dd className="min-w-0 px-4 py-3 font-medium">
                    {edit ? (
                      <InlineText
                        value={localPhone}
                        placeholder={chromeText(chrome, "formPhoneEmptyPh", "비우면 대표 전화")}
                        onCommit={(value) => edit.patch(section.id, { ...section.content, phone: value })}
                      />
                    ) : phoneHref(phone) ? (
                      <a href={phoneHref(phone)} className="font-semibold text-primary">{phone}</a>
                    ) : (
                      <span className="font-semibold">{phone}</span>
                    )}
                  </dd>
                </div>
              ) : null}
              {(edit || String(section.content.hours ?? "").trim()) ? (
                <div className={cn("border-b border-border last:border-b-0", narrow ? "grid grid-cols-1" : "grid grid-cols-[auto_1fr]")}>
                  <dt className="bg-surface px-4 py-3 text-sm text-text-muted">{rowName("hoursLabel", "phRowHours", "운영")}</dt>
                  <dd className="min-w-0 px-4 py-3 font-medium">
                    <InlineText value={String(section.content.hours ?? "")} onCommit={textCommit(section, "hours", edit)} placeholder={chromeText(chrome, "phHours", "운영 시간")} />
                  </dd>
                </div>
              ) : null}
              {(edit || String(section.content.parking ?? "").trim()) ? (
                <div className={cn("border-b border-border last:border-b-0", narrow ? "grid grid-cols-1" : "grid grid-cols-[auto_1fr]")}>
                  <dt className="bg-surface px-4 py-3 text-sm text-text-muted">{rowName("parkingLabel", "phRowParking", "주차")}</dt>
                  <dd className="min-w-0 px-4 py-3 font-medium">
                    <InlineText value={String(section.content.parking ?? "")} multiline onCommit={textCommit(section, "parking", edit)} placeholder={chromeText(chrome, "phParking", "주차 안내")} />
                  </dd>
                </div>
              ) : null}
            </dl>
            ) : null}
            {edit || address.trim() ? (
              <button
                type="button"
                className="mt-3 inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-5 text-sm font-semibold"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
                  void copyAddress();
                }}
              >
                {copied === "ok" ? copyFlash(snapshot.globalSettings, "ok") : copied === "fail" ? copyFlash(snapshot.globalSettings, "fail") : edit ? (
                  <InlineText value={String(section.content.copyAddressLabel ?? "")} placeholder={chromeText(chrome, "phCopyAddress", "주소 복사")} onCommit={textCommit(section, "copyAddressLabel", edit)} />
                ) : (
                  String(section.content.copyAddressLabel ?? "").trim() || chromeText(chrome, "phCopyAddress", "주소 복사")
                )}
              </button>
            ) : null}
            {(edit || String(section.content.guide ?? "").trim()) ? (
              <p className="mt-4 text-text-body">
                <BoldCopy value={String(section.content.guide ?? "")} multiline onCommit={textCommit(section, "guide", edit)} placeholder={chromeText(chrome, "phGuide", "찾아오는 방법")} />
              </p>
            ) : null}
            {routes.some((route) => edit || route.label.trim() || route.detail.trim()) || edit ? (
              <div className="mt-4 space-y-3">
                {routes.map((route, index) => edit || route.label.trim() || route.detail.trim() ? (
                  <div key={`${section.id}-route-${index}`} className={cn(edit && "group/edit relative pr-9")}>
                    <p className="text-sm font-semibold text-primary">
                      <InlineText
                        value={route.label}
                        placeholder={chromeText(chrome, "phTransit", "지하철")}
                        onCommit={edit ? (value) => setRoutes(routes.map((row, rowIndex) => (rowIndex === index ? { ...row, label: value } : row))) : undefined}
                      />
                    </p>
                    {(edit || route.detail.trim()) ? (
                      <p className="mt-1 text-text-body">
                        <InlineText
                          value={route.detail}
                          multiline
                          placeholder={chromeText(chrome, "phTransitDetail", "역, 출구, 노선")}
                          onCommit={edit ? (value) => setRoutes(routes.map((row, rowIndex) => (rowIndex === index ? { ...row, detail: value } : row))) : undefined}
                        />
                      </p>
                    ) : null}
                    {edit ? (
                      <EditRemoveX
                        className="absolute right-0 top-0"
                        onClick={() => setRoutes(routes.filter((_, rowIndex) => rowIndex !== index))}
                      />
                    ) : null}
                  </div>
                ) : null)}
                {edit && routes.length < DIRECTIONS_ROUTE_MAX ? (
                  <button type="button" className="text-sm font-medium text-primary" onClick={() => setRoutes([...routes, { label: chromeText(chrome, "seedRouteLabel", "교통"), detail: chromeText(chrome, "seedRouteDetail", "안내를 입력하세요.") }])}>
                    {chromeText(chrome, "editAddRoute", "교통 추가")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {edit || mapImageUrl || mapUrl ? (
          <div>
            {edit ? (
              <p className="mb-3 text-sm text-text-muted">{chromeText(chrome, "hintMapEmbed", "지도는 페이지 안에 삽입되지 않습니다. 약도를 올리고 링크를 넣으면, 방문자가 약도를 눌러 지도로 이동합니다.")}</p>
            ) : null}
            {edit || mapImageUrl ? (
            <div className="relative overflow-hidden rounded-[16px] border border-border bg-white">
              {edit ? (
                <EditableImage
                  src={mapImageUrl}
                  alt={String(section.content.mapAlt ?? "").trim() || chromeText(chrome, "phMapAlt", "약도")}
                  imageClassName={cn(mapFrame, "w-full object-cover")}
                  emptyClassName={cn(mapFrame, "flex items-center justify-center")}
                  emptyLabel={<InlineText value={String(section.content.mapEmptyLabel ?? "")} placeholder={chromeText(chrome, "phMapEmpty", "약도 이미지")} onCommit={textCommit(section, "mapEmptyLabel", edit)} />}
                  onUpload={(url) => edit.patch(section.id, { ...section.content, mapImageUrl: url })}
                />
              ) : mapUrl ? (
                <a href={mapUrl} target="_blank" rel="noreferrer" className="block">
                  {mapPicture}
                  <span className="pf-media-chip pf-media-chip-lg absolute bottom-3 right-3">
                    {String(section.content.mapLinkLabel ?? "").trim() || chromeText(chrome, "phMapLink", "지도에서 보기")}
                  </span>
                </a>
              ) : (
                <button type="button" className="block w-full" onClick={() => setMapOpen(true)}>
                  {mapPicture}
                </button>
              )}
              {edit && mapImageUrl ? (
                <span className="pf-media-chip pf-media-chip-lg absolute bottom-3 right-3 z-10">
                  <InlineText value={String(section.content.mapLinkLabel ?? "")} placeholder={chromeText(chrome, "phMapLink", "지도에서 보기")} onCommit={textCommit(section, "mapLinkLabel", edit)} />
                </span>
              ) : null}
            </div>
            ) : null}
            {mapUrl ? (
              <div className="mt-3">
                {edit ? (
                  <span className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white">
                    <InlineText value={String(section.content.mapOpenLabel ?? "")} className="text-white" placeholder={chromeText(chrome, "phMapOpen", "지도 열기")} onCommit={textCommit(section, "mapOpenLabel", edit)} />
                  </span>
                ) : (
                  <a href={mapUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white">
                    {String(section.content.mapOpenLabel ?? "").trim() || chromeText(chrome, "phMapOpen", "지도 열기")}
                  </a>
                )}
              </div>
            ) : null}
            {edit && mapImageUrl ? (
              <button type="button" className="mt-3 text-sm text-text-muted" onClick={() => edit.patch(section.id, { ...section.content, mapImageUrl: "" })}>
                {chromeText(chrome, "mediaMapDelete", "약도 삭제")}
              </button>
            ) : null}
            {edit && mapUrl ? <p className="mt-3 text-sm text-text-muted">{chromeText(chrome, "hintMapLinked", "지도 링크가 연결되어 있습니다. 편집 중에는 이동하지 않습니다.")}</p> : null}
            {edit ? (
              <label className="mt-3 block text-sm text-text-body">
                {chromeText(chrome, "mediaMapField", "지도 링크")}
                <input
                  className="ui-field mt-1"
                  value={rawMapUrl}
                  placeholder={chromeText(chrome, "phHttps", "https://")}
                  onChange={(event) => edit.patch(section.id, { ...section.content, mapUrl: event.target.value })}
                />
                {rawMapUrl.trim() && !mapUrl ? <span className="mt-1 block text-xs text-danger">{chromeText(chrome, "hintHttp", "http 또는 https 주소만 연결됩니다.")}</span> : null}
              </label>
            ) : null}
          </div>
          ) : null}
        </div>
      </div>
      {mapOpen && mapImageUrl ? <PhotoViewer images={[{ url: mapImageUrl, alt: String(section.content.mapAlt ?? "").trim() || chromeText(chrome, "phMapAlt", "약도") }]} index={0} onIndex={() => undefined} onClose={() => setMapOpen(false)} /> : null}
    </div>
  );
}

/** 직방 footer.info와 동일: 본문 우선, 없으면 구버전 notices·footerNote를 이어 붙인다. */
function footerInfoCopy(content: Record<string, unknown>) {
  const body = String(content.body ?? "").trim();
  if (body) return body;
  const notices = legalNotices(content.notices)
    .map((notice) => notice.text.trim())
    .filter(Boolean);
  const note = String(content.footerNote ?? "").trim();
  return [...notices, note].filter(Boolean).join("\n");
}

function Legal({ section, snapshot }: { section: PageSection; snapshot: PageSnapshot; live?: boolean }) {
  const chrome = useEditorChrome();
  const edit = useCanvasEdit();
  const footerSubtitle = String(section.content.footerSubtitle ?? "");
  const headerSubtitle = String(snapshot.globalSettings.navSubtitle ?? "");
  const subtitle = footerSubtitle.trim() || headerSubtitle.trim() || "OFFICIAL";
  const infoValue = edit ? String(section.content.body ?? "") : footerInfoCopy(section.content);
  const phoneLabel = String(section.content.sitePhoneLabel ?? "").trim() || chromeText(chrome, "phPhoneCaption", "문의번호");
  const phone = snapshot.phone || "";
  const siteName = snapshot.projectName || "";

  // 프리미엄 화보형(info): 직방 LUMIÈRE lc-footer 골격 — pf-footer 스타일이 midday에 없어 깨지던 문제 수정
  if (snapshot.templateCode === "info") {
    return (
      <footer className="lc-footer">
        <div className="lc-wrap">
          <div className="lc-footer__top">
            <div>
              <h2 className="lc-footer__title">
                {edit ? (
                  <InlineText
                    value={siteName}
                    placeholder={chromeText(chrome, "phSiteName", "현장명")}
                    onCommit={edit.setSiteName}
                  />
                ) : (
                  siteName
                )}
              </h2>
              <p className="lc-footer__sub">
                {edit ? (
                  <InlineText
                    value={footerSubtitle.trim() ? footerSubtitle : subtitle}
                    placeholder="OFFICIAL"
                    onCommit={(value) => edit.patch(section.id, { ...section.content, footerSubtitle: value })}
                  />
                ) : (
                  subtitle
                )}
              </p>
            </div>
            <div>
              <p className="lc-footer__phone">
                {edit ? (
                  <InlineText value={phone} placeholder={chromeText(chrome, "phPhoneMain", "대표 전화")} onCommit={edit.setPhone} />
                ) : phoneHref(phone) ? (
                  <a href={phoneHref(phone)}>{phone}</a>
                ) : (
                  phone
                )}
              </p>
              {(edit || infoValue.trim()) ? (
                <div className="lc-footer__info">
                  <BoldCopy
                    value={infoValue}
                    multiline
                    onCommit={
                      edit
                        ? (value) =>
                            edit.patch(section.id, {
                              ...section.content,
                              body: value,
                              notices: [],
                              footerNote: "",
                            })
                        : undefined
                    }
                    placeholder={chromeText(chrome, "phLegalBody", "푸터 안내 문구")}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className="lc-footer__bottom">
            <span>© {siteName}</span>
            <span>
              문의번호 · {phone}
            </span>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="pf-footer">
      <div className="pf-ft-wrap">
        <div className="pf-ft-top">
          <div className="pf-ft-brand min-w-0">
            <p className="pf-ft-name">{siteName}</p>
            {edit || subtitle ? (
              <p className="pf-ft-sub">
                {edit ? (
                  <InlineText
                    value={footerSubtitle}
                    placeholder={headerSubtitle || chromeText(chrome, "phNavSubtitle", "상단 보조 문구")}
                    onCommit={(value) => edit.patch(section.id, { ...section.content, footerSubtitle: value })}
                  />
                ) : (
                  subtitle
                )}
              </p>
            ) : null}
          </div>
          <div className="pf-ft-tel">
            <p className="pf-ft-tel-label">
              {edit ? (
                <InlineText value={String(section.content.sitePhoneLabel ?? "")} placeholder={chromeText(chrome, "phPhoneCaption", "문의번호")} onCommit={textCommit(section, "sitePhoneLabel", edit)} />
              ) : (
                phoneLabel
              )}
            </p>
            {!edit && phoneHref(phone) ? (
              <a href={phoneHref(phone)} className="pf-ft-tel-num">
                {phone}
              </a>
            ) : (
              <p className="pf-ft-tel-num">
                <InlineText value={phone} placeholder={chromeText(chrome, "phPhoneMain", "대표 전화")} onCommit={edit?.setPhone} />
              </p>
            )}
          </div>
        </div>
        {(edit || infoValue.trim()) ? (
          <div className="pf-ft-info">
            <BoldCopy
              value={infoValue}
              multiline
              onCommit={
                edit
                  ? (value) =>
                      edit.patch(section.id, {
                        ...section.content,
                        body: value,
                        notices: [],
                        footerNote: "",
                      })
                  : undefined
              }
              placeholder={chromeText(chrome, "phLegalBody", "푸터 안내 문구")}
            />
          </div>
        ) : null}
        <p className="pf-ft-copy">ⓒ {new Date().getFullYear()} ad.one.bridge. All rights reserved.</p>
      </div>
    </footer>
  );
}
