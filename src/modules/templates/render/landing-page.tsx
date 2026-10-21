"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { PageSection, PageSnapshot } from "@/types";
import { floorplanImages, floorplanSpecs, FLOORPLAN_SPEC_MAX, GALLERY_IMAGE_MAX, LOCATION_MATRIX_DEFAULTS, LOCATION_MATRIX_ICONS, locationMatrix, PREMIUM_ICONS, PREMIUM_ITEM_MAX, premiumItems, sectionEyebrowText, withFloorplanImages, withFloorplanSpecs, type FloorplanImage, type LocationMatrixIcon, type LocationMatrixItem, type PremiumIcon, type PremiumItem } from "@/modules/templates/definitions";
import { gnbItemsFromSections } from "@/modules/sections/duplicate";
import { LeadForm } from "@/modules/templates/render/lead-form";
import { TrackedLink, TrackedSection } from "@/modules/templates/render/tracker";
import { CanvasEditContext, EditorChromeContext, chromeText, useEditorChrome, type CanvasEdit, useCanvasEdit } from "@/modules/editor/edit-context";
import { InlineText, MarkedText } from "@/modules/editor/inline-text";
import { useDialogFocusTrap } from "@/lib/a11y/dialog-focus";
import { cn } from "@/lib/cn";

function visible(sections: PageSection[]) {
  return [...sections].filter((section) => section.isVisible).sort((a, b) => a.sortOrder - b.sortOrder);
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

function heroObjectPosition(value: unknown) {
  const raw = String(value ?? "").trim();
  if (raw === "top" || raw === "bottom" || raw === "left" || raw === "right" || raw === "center") return raw;
  return "center";
}

function HeroVideo({
  videoUrl,
  posterUrl,
  imageUrl,
  mobileUrl,
  narrow,
  imageAlt,
  className,
  objectPosition,
}: {
  videoUrl: string;
  posterUrl: string;
  imageUrl: string;
  mobileUrl: string;
  narrow: boolean;
  imageAlt: string;
  className?: string;
  objectPosition?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);
  const style = { objectPosition: heroObjectPosition(objectPosition) };
  if (reducedMotion || failed) {
    if (imageUrl || mobileUrl || posterUrl) {
      return (
        <HeroPicture
          imageUrl={imageUrl || posterUrl || ""}
          mobileUrl={mobileUrl || posterUrl || ""}
          narrow={narrow}
          alt={imageAlt}
          className={className ?? ""}
          objectPosition={objectPosition}
        />
      );
    }
    return <div className={cn("bg-surface", className)} />;
  }
  return (
    <video
      className={className}
      style={style}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={posterUrl || undefined}
      onError={() => setFailed(true)}
    >
      <source src={videoUrl} />
    </video>
  );
}

function policyHref(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("/")) return trimmed;
  return "";
}

function httpUrl(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return "";
}

function externalFormUrl(snapshot: PageSnapshot) {
  const form = snapshot.sections.find((section) => section.sectionType === "lead_form");
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

function PriceBox({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const label = String(section.content.priceLabel ?? "");
  const type = String(section.content.priceType ?? "");
  const main = String(section.content.priceMain ?? section.content.priceLine ?? "");
  const sub = String(section.content.priceSub ?? "");
  const note = String(section.content.priceNote ?? "");
  if (!edit && !label.trim() && !type.trim() && !main.trim() && !sub.trim() && !note.trim()) return null;
  return (
    <div className="mt-6 rounded-[16px] border border-border bg-surface p-4">
      <p className="text-sm text-text-muted">
        <InlineText value={label} placeholder={chromeText(chrome, "phPriceLabel", "가격 이름")} onCommit={textCommit(section, "priceLabel", edit)} />
      </p>
      <p className="mt-1 break-keep text-2xl font-bold">
        {edit || type.trim() ? <InlineText value={type} placeholder={chromeText(chrome, "phPriceType", "유형")} className="mr-2 text-lg font-semibold" onCommit={textCommit(section, "priceType", edit)} /> : null}
        <InlineText value={main} placeholder={chromeText(chrome, "phPriceMain", "금액")} onCommit={textCommit(section, "priceMain", edit)} />
      </p>
      {edit || sub.trim() ? (
        <p className="mt-1 text-sm text-text-muted line-through">
          <InlineText value={sub} placeholder={chromeText(chrome, "phPriceSub", "비교 금액")} onCommit={textCommit(section, "priceSub", edit)} />
        </p>
      ) : null}
      {edit || note.trim() ? (
        <p className="mt-2 text-sm text-text-body">
          <BoldCopy value={note} multiline placeholder={chromeText(chrome, "phPriceNote", "가격 안내")} onCommit={textCommit(section, "priceNote", edit)} />
        </p>
      ) : null}
    </div>
  );
}

function BenefitBar({ section, snapshot, live }: { section: PageSection; snapshot: PageSnapshot; live: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const benefit = String(section.content.benefit ?? "");
  if (!edit && !benefit.trim()) return null;
  const className = "mt-4 flex w-full items-center gap-3 rounded-[14px] border border-border bg-white px-4 py-3 text-left";
  const inner = (
    <>
      <span className="rounded-[8px] bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
        {edit ? (
          <InlineText value={String(section.content.benefitBadge ?? "")} placeholder={chromeText(chrome, "formPerkItemPh", "혜택")} onCommit={textCommit(section, "benefitBadge", edit)} />
        ) : (
          String(section.content.benefitBadge ?? "").trim() || chromeText(chrome, "formPerkItemPh", "혜택")
        )}
      </span>
      <span className="text-sm font-semibold">
        {edit ? <InlineText value={benefit} placeholder={chromeText(chrome, "phBenefit", "혜택 문구")} onCommit={textCommit(section, "benefit", edit)} /> : <MarkedText text={benefit} />}
      </span>
    </>
  );
  if (edit) return <div className={className}>{inner}</div>;
  const url = externalFormUrl(snapshot);
  if (live && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <a
      href="#inquiry"
      className={className}
      onClick={(event) => {
        if (!live) {
          event.preventDefault();
          scrollToAnchor("inquiry", event.currentTarget);
        }
      }}
    >
      {inner}
    </a>
  );
}

function TrustTags({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const tags = ((section.content.trustTags as Array<{ text?: string } | string> | undefined) ?? []).map((item) =>
    typeof item === "string" ? item : String(item.text ?? ""),
  );
  if (!edit && !tags.some((tag) => tag.trim())) return null;
  function setTags(next: string[]) {
    edit?.patch(section.id, { ...section.content, trustTags: next.map((text) => ({ text })) });
  }
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag, index) => !edit && !tag.trim() ? null : (
        <li key={index} className="inline-flex items-center gap-1 rounded-[8px] bg-primary-soft px-3 py-2 text-sm font-medium text-primary">
          <span aria-hidden>✓</span>
          <InlineText value={tag} placeholder={chromeText(chrome, "seedTag", "문구")} onCommit={edit ? (value) => setTags(tags.map((item, itemIndex) => (itemIndex === index ? value : item))) : undefined} />
          {edit && tags.length > 1 ? (
            <span className="flex gap-1">
              <button type="button" className="text-xs text-text-body disabled:text-text-muted" disabled={index === 0} onClick={() => {
                const next = [...tags];
                const [row] = next.splice(index, 1);
                if (!row) return;
                next.splice(index - 1, 0, row);
                setTags(next);
              }}>{chromeText(chrome, "editBefore", "앞")}</button>
              <button type="button" className="text-xs text-text-body disabled:text-text-muted" disabled={index === tags.length - 1} onClick={() => {
                const next = [...tags];
                const [row] = next.splice(index, 1);
                if (!row) return;
                next.splice(index + 1, 0, row);
                setTags(next);
              }}>{chromeText(chrome, "editAfter", "뒤")}</button>
              <button type="button" className="text-xs text-text-muted" onClick={() => setTags(tags.filter((_, itemIndex) => itemIndex !== index))}>
                {chromeText(chrome, "editRemove", "삭제")}
              </button>
            </span>
          ) : null}
        </li>
      ))}
      {edit && tags.length < 8 ? (
        <li>
          <button type="button" className="text-sm font-semibold text-primary" onClick={() => setTags([...tags, chromeText(chrome, "seedTag", "문구")])}>
            {chromeText(chrome, "editAddTag", "문구 추가")}
          </button>
        </li>
      ) : null}
    </ul>
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

function SiteLogo({ snapshot }: { snapshot: PageSnapshot }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const [hint, setHint] = useState("");
  const logoUrl = String(snapshot.globalSettings.logoUrl ?? "");
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
  if (logoUrl && !edit) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt="" className="h-[50px] w-[50px] rounded-[10px] border border-border object-contain" />
    );
  }
  if (logoUrl && edit) {
    return (
      <span className="inline-flex items-center gap-1">
        <label className="relative flex h-[50px] w-[50px] cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-border bg-white" title={chromeText(chrome, "ariaLogoChange", "로고 바꾸기")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="" className="h-full w-full object-contain" />
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
        <button type="button" className="text-[11px] text-text-muted" onClick={() => edit.setLogo("")}>
          {chromeText(chrome, "mediaLogoDelete", "삭제")}
        </button>
        {hint ? <span className="max-w-40 text-[11px] text-danger">{hint}</span> : null}
      </span>
    );
  }
  if (!edit) return null;
  const callout = hint || chromeText(chrome, "mediaLogoHint", "로고를 50×50 사이즈 이미지로 교체해 주세요.");
  return (
    <span className="relative inline-flex">
      <label className="relative flex h-[50px] w-[50px] cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-border bg-surface text-text-muted" title={chromeText(chrome, "ariaLogoChange", "로고 바꾸기")}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m21 16-5-5-9 9" />
        </svg>
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
      <span role="status" className="pointer-events-none absolute left-0 top-[calc(100%+10px)] z-40 w-max max-w-[220px] rounded-[8px] bg-text-primary px-3 py-1.5 text-[11px] font-semibold leading-snug text-white">
        <span className="absolute left-5 top-[-3px] h-1.5 w-1.5 rotate-45 bg-text-primary" aria-hidden />
        {callout}
      </span>
    </span>
  );
}

function useActiveAnchor(pageRef: { current: HTMLElement | null }, sections: PageSection[]) {
  const items = sections.filter((section) => section.sectionType !== "legal");
  const key = items.map((section) => section.anchorId).join("|");
  const [active, setActive] = useState(items[0]?.anchorId ?? "");
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const root = page.closest("[data-preview-scroll]");
    const nodes = items
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
  if (node && frame instanceof HTMLElement) {
    const top = node.getBoundingClientRect().top - frame.getBoundingClientRect().top + frame.scrollTop - 72;
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
  mobileUrl,
  narrow,
  className,
  alt,
  objectPosition,
}: {
  imageUrl: string;
  mobileUrl: string;
  narrow: boolean;
  className: string;
  alt: string;
  objectPosition?: string;
}) {
  const src = narrow && mobileUrl ? mobileUrl : imageUrl;
  if (!src) return null;
  const style = { objectPosition: heroObjectPosition(objectPosition) };
  if (narrow) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} style={style} />
    );
  }
  return (
    <picture>
      {mobileUrl ? <source media="(max-width: 767px)" srcSet={mobileUrl} /> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl || mobileUrl} alt={alt} className={className} style={style} />
    </picture>
  );
}

function HeroMediaControls({ section }: { section: PageSection }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const [hint, setHint] = useState("");
  if (!edit) return null;
  const videoUrl = String(section.content.videoUrl ?? "");
  const posterUrl = String(section.content.posterUrl ?? "");
  const playing = String(section.content.mediaMode ?? "") === "video" && Boolean(videoUrl);
  return (
    <div className="absolute bottom-6 left-6 z-10 flex max-w-[16rem] flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex h-12 cursor-pointer items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold">
          {chromeText(chrome, "mediaVideo", "영상")}
          <input
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setHint("");
              void edit.upload(file).then((url) => {
                if (!url) return;
                edit.patch(section.id, { ...section.content, videoUrl: url, mediaMode: "video" });
              }).catch((error: unknown) => setHint(error instanceof Error && error.message !== "IMAGE_READ" ? error.message : chromeText(chrome, "mediaVideoFail", "영상을 올리지 못했습니다.")));
            }}
          />
        </label>
        {playing ? (
          <button type="button" className="inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold" onClick={() => edit.patch(section.id, { ...section.content, mediaMode: "image" })}>
            {chromeText(chrome, "mediaImageView", "이미지로 보기")}
          </button>
        ) : videoUrl ? (
          <button type="button" className="inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold" onClick={() => edit.patch(section.id, { ...section.content, mediaMode: "video" })}>
            {chromeText(chrome, "mediaVideoView", "영상으로 보기")}
          </button>
        ) : null}
        {videoUrl ? (
          <button type="button" className="inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold" onClick={() => edit.patch(section.id, { ...section.content, videoUrl: "", mediaMode: "image" })}>
            {chromeText(chrome, "mediaVideoDelete", "영상 삭제")}
          </button>
        ) : null}
        <label className="inline-flex h-12 cursor-pointer items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold">
          {chromeText(chrome, "mediaPoster", "포스터")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setHint("");
              void edit.upload(file).then((url) => {
                if (!url) return;
                edit.patch(section.id, { ...section.content, posterUrl: url });
              }).catch((error: unknown) => setHint(error instanceof Error && error.message !== "IMAGE_READ" ? error.message : chromeText(chrome, "mediaPosterFail", "포스터를 올리지 못했습니다.")));
            }}
          />
        </label>
        {posterUrl ? (
          <button type="button" className="inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold" onClick={() => edit.patch(section.id, { ...section.content, posterUrl: "" })}>
            {chromeText(chrome, "mediaPosterDelete", "포스터 삭제")}
          </button>
        ) : null}
      </div>
      {hint ? <p className="rounded-[14px] bg-white px-3 py-2 text-xs text-danger">{hint}</p> : <p className="rounded-[14px] bg-white px-3 py-2 text-xs text-text-muted">{chromeText(chrome, "mediaVideoHint", "3.5MB를 넘는 영상은 오른쪽 패널의 영상 주소에 넣습니다.")}</p>}
    </div>
  );
}
function HeroImageButton({ section, imageUrl }: { section: PageSection; imageUrl: string }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  if (!edit) return null;
  const mobileUrl = String(section.content.mobileImageUrl ?? "");
  return (
    <div className="absolute bottom-6 right-6 z-10 flex flex-wrap justify-end gap-2">
      {imageUrl ? (
        <button
          type="button"
          className="inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold"
          onClick={() => edit.patch(section.id, { ...section.content, imageUrl: "", mediaMode: "image" })}
        >
          {chromeText(chrome, "mediaImageDelete", "이미지 삭제")}
        </button>
      ) : null}
      <label className="inline-flex h-12 cursor-pointer items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold">
        {chromeText(chrome, "mediaImageChange", "이미지 변경")}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void edit.upload(file).then((url) => edit.patch(section.id, { ...section.content, imageUrl: url, mediaMode: "image" })).catch(() => undefined);
          }}
        />
      </label>
      <label className="inline-flex h-12 cursor-pointer items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold">
        {chromeText(chrome, "mediaMobile", "모바일 이미지")}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void edit.upload(file).then((url) => edit.patch(section.id, { ...section.content, mobileImageUrl: url })).catch(() => undefined);
          }}
        />
      </label>
      {mobileUrl ? (
        <button
          type="button"
          className="inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-4 text-sm font-semibold"
          onClick={() => edit.patch(section.id, { ...section.content, mobileImageUrl: "" })}
        >
          {chromeText(chrome, "mediaMobileDelete", "모바일 이미지 삭제")}
        </button>
      ) : null}
    </div>
  );
}

const ViewerLabelsContext = createContext({ prev: "", next: "", close: "" });

export function LandingPage({
  snapshot,
  mode = "live",
  highlightId,
  variant = "desktop",
  edit = null,
  showPopup = false,
  onClosePopup,
  onActiveAnchor,
}: {
  snapshot: PageSnapshot;
  mode?: "live" | "preview";
  highlightId?: string | null;
  variant?: "desktop" | "tablet" | "mobile";
  edit?: CanvasEdit | null;
  showPopup?: boolean;
  onClosePopup?: () => void;
  onActiveAnchor?: (anchorId: string) => void;
}) {
  const sections = edit ? [...snapshot.sections].sort((a, b) => a.sortOrder - b.sortOrder) : visible(snapshot.sections);
  const navSections = sections.filter((section) => section.isVisible);
  const gnb = gnbItemsFromSections(snapshot.sections);
  const layout =
    snapshot.templateCode === "video-ready" ? "photo" : snapshot.templateCode === "forest" ? "forest" : snapshot.templateCode === "info" ? "info" : "product";

  const live = mode === "live";
  const slug = snapshot.publicSlug;
  const narrow = variant === "tablet" || variant === "mobile";
  const hero = sections.find((section) => section.sectionType === "hero");
  const editorChrome = Object.fromEntries(
    Object.entries(snapshot.globalSettings).map(([key, value]) => [key, value == null ? "" : String(value)]),
  );
  const cta =
    String(hero?.content.ctaLabel ?? snapshot.globalSettings.ctaLabel ?? "").trim() ||
    chromeText(editorChrome, "phCta", "관심고객 등록");
  const formUrl = externalFormUrl(snapshot);
  const pageRef = useRef<HTMLDivElement>(null);
  const activeAnchor = useActiveAnchor(pageRef, sections);
  useEffect(() => {
    if (activeAnchor) onActiveAnchor?.(activeAnchor);
  }, [activeAnchor, onActiveAnchor]);
  const viewerLabels = {
    prev: String(snapshot.globalSettings.viewerPrev ?? ""),
    next: String(snapshot.globalSettings.viewerNext ?? ""),
    close: String(snapshot.globalSettings.viewerClose ?? ""),
  };
  return (
    <CanvasEditContext.Provider value={edit}>
    <EditorChromeContext.Provider value={editorChrome}>
    <ViewerLabelsContext.Provider value={viewerLabels}>
    <div ref={pageRef} className={cn("bg-white text-text-primary", variant === "mobile" && "text-[15px]")}>
      <header className="sticky top-0 z-20 border-b border-border/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <SiteLogo snapshot={snapshot} />
            <div className="min-w-0">
              <a href="#hero" className="block truncate font-semibold" onClick={(event) => edit && event.preventDefault()}>
                <InlineText value={snapshot.projectName} onCommit={edit ? edit.setSiteName : undefined} placeholder={chromeText(editorChrome, "phSite", "현장명")} />
              </a>
              {edit || String(snapshot.globalSettings.navSubtitle ?? "").trim() ? (
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
          <div className="flex shrink-0 items-center gap-3">
            <SectionMenu gnb={gnb} live={live} slug={slug} forceOpen={narrow} active={activeAnchor} />
            {snapshot.phone && !narrow ? (
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
                {live && phoneHref(snapshot.phone) ? (
                  <a href={phoneHref(snapshot.phone)} className="text-sm font-semibold">{snapshot.phone}</a>
                ) : (
                  <p className="text-sm font-semibold">{snapshot.phone}</p>
                )}
              </div>
            ) : null}
            <SharePage snapshot={snapshot} live={live} />
            {live ? (
              <TrackedLink href={formUrl || "#inquiry"} target={formUrl ? "_blank" : undefined} slug={slug} eventName="lead_cta_click" className={cn("inline-flex h-12 items-center rounded-[14px] bg-primary px-5 font-semibold text-white", narrow ? "px-4 text-sm" : "text-[17px]")}>
                {cta}
              </TrackedLink>
            ) : (
              <a
                href="#inquiry"
                className={cn("inline-flex h-12 items-center rounded-[14px] bg-primary px-5 font-semibold text-white", narrow ? "px-4 text-sm" : "text-[17px]")}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToAnchor("inquiry", event.currentTarget);
                }}
              >
                {cta}
              </a>
            )}
          </div>
        </div>
      </header>
      <SectionScrollNav sections={navSections} narrow={narrow} active={activeAnchor} />
      {sections.map((section) => {
        const inner = (
          <>
            {!section.isVisible ? (
              <p className="bg-surface px-4 py-2 text-center text-xs font-semibold text-text-muted">{chromeText(editorChrome, "hintHidden", "숨긴 섹션입니다. 공개 페이지와 미리보기에는 나오지 않습니다.")}</p>
            ) : null}
            {section.sectionType === "hero" ? <Hero section={section} snapshot={snapshot} layout={layout} live={live} narrow={narrow} /> : null}
            {section.sectionType === "overview" ? <Overview section={section} stacked={layout === "photo" || layout === "forest"} narrow={narrow} live={live} /> : null}
            {section.sectionType === "location" ? <Cards section={section} timeline={layout === "photo"} narrow={narrow} /> : null}
            {section.sectionType === "premium" ? <Premium section={section} magazine={layout === "photo" || layout === "forest"} narrow={narrow} /> : null}
            {section.sectionType === "gallery" ? <Gallery section={section} /> : null}
            {section.sectionType === "floorplan" ? <Floorplan section={section} narrow={narrow} /> : null}
            {section.sectionType === "directions" ? <Directions section={section} sitePhone={snapshot.phone} narrow={narrow} snapshot={snapshot} /> : null}
            {section.sectionType === "lead_form" ? (
              <LeadForm snapshot={snapshot} section={section} disabled={mode === "preview"} narrow={narrow} />
            ) : null}
            {section.sectionType === "legal" ? <Legal section={section} snapshot={snapshot} live={live} /> : null}
          </>
        );
        const className = cn(!section.isVisible && "opacity-60", highlightId === section.id && "ring-2 ring-primary ring-offset-4");
        return live ? (
          <TrackedSection key={section.id} slug={slug} name={section.sectionType} id={section.anchorId} className={className}>
            {inner}
          </TrackedSection>
        ) : (
          <section key={section.id} id={section.anchorId} className={className}>
            {inner}
          </section>
        );
      })}
      <ContactDock snapshot={snapshot} live={live} compact={narrow} />
      {live ? <VisitPopup snapshot={snapshot} live /> : null}
      {showPopup ? <VisitPopup snapshot={snapshot} forced onClose={onClosePopup} /> : null}
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
  const shown = [first.trim(), second.trim()].filter(Boolean).join(" ");
  if (!edit && !shown) return null;
  function commit(key: "region1" | "region2", value: string) {
    edit?.patch(section.id, {
      ...section.content,
      region: "",
      region1: key === "region1" ? value : firstStored || legacy,
      region2: key === "region2" ? value : second,
    });
  }
  if (!edit) return <p className="text-sm text-text-muted">{shown}</p>;
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
      <InlineText value={first} placeholder={chromeText(chrome, "phRegion1", "시·도")} onCommit={(value) => commit("region1", value)} />
      <span aria-hidden>·</span>
      <InlineText value={second} placeholder={chromeText(chrome, "phRegion2", "시·군·구")} onCommit={(value) => commit("region2", value)} />
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

function OverviewGlance({
  snapshot,
  narrow,
  limit,
  showSchedule,
  showStats = false,
}: {
  snapshot: PageSnapshot;
  narrow: boolean;
  limit: number;
  showSchedule: boolean;
  showStats?: boolean;
}) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const overview = snapshot.sections.find((item) => item.sectionType === "overview" && item.isVisible);
  if (!overview) return null;
  const source = overview;
  const facts = (overview.content.facts as Array<{ label: string; value: string }>) ?? [];
  const rows = facts
    .map((fact, index) => ({ fact, index }))
    .filter(({ fact }) => edit || fact.label.trim() || fact.value.trim());
  const shown = rows.slice(0, limit);
  const schedule = ((overview.content.schedule as Array<{ title?: string; date?: string; note?: string }>) ?? []).map((item) => ({
    title: String(item.title ?? ""),
    date: String(item.date ?? ""),
    note: String(item.note ?? ""),
  }));
  const scheduleRows = schedule
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => edit || item.title.trim() || item.date.trim());
  const shownSchedule = scheduleRows.slice(0, 4);
  function setFacts(next: Array<{ label: string; value: string }>) {
    edit?.patch(source.id, { ...source.content, facts: next });
  }
  function setSchedule(next: Array<{ title: string; date: string; note: string }>) {
    edit?.patch(source.id, { ...source.content, schedule: next.slice(0, 8) });
  }
  return (
    <div className="mt-6">
      {showStats ? <OverviewStats section={overview} narrow={narrow} /> : null}
      {shown.length > 0 ? (
        <dl className="mt-4 overflow-hidden rounded-[16px] border border-border bg-white">
          {shown.map(({ fact, index }) => (
            <div key={`${overview.id}-glance-${index}`} className={cn("grid border-b border-border last:border-b-0", narrow ? "grid-cols-1" : "grid-cols-[7.5rem_1fr]")}>
              <dt className="border-r border-border bg-surface px-3 py-3 text-sm text-text-muted">
                <InlineText
                  value={fact.label}
                  placeholder={chromeText(chrome, "phItem", "항목")}
                  onCommit={edit ? (value) => setFacts(facts.map((row, rowIndex) => (rowIndex === index ? { ...row, label: value } : row))) : undefined}
                />
              </dt>
              <dd className="px-3 py-3 text-sm font-semibold">
                <InlineText
                  value={fact.value}
                  placeholder={chromeText(chrome, "phContent", "내용")}
                  onCommit={edit ? (value) => setFacts(facts.map((row, rowIndex) => (rowIndex === index ? { ...row, value } : row))) : undefined}
                />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {rows.length > limit || edit ? (
        <button type="button" className="mt-3 text-sm font-semibold text-primary" onClick={(event) => {
          if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
          scrollToAnchor(overview.anchorId, event.currentTarget);
        }}>
          {edit ? (
            <InlineText
              value={String(overview.content.factsMoreLabel ?? "")}
              placeholder={chromeText(chrome, "phFactsMore", "사업개요 전체")}
              onCommit={(value) => edit.patch(overview.id, { ...overview.content, factsMoreLabel: value })}
            />
          ) : (
            String(overview.content.factsMoreLabel ?? "").trim() || chromeText(chrome, "phFactsMore", "사업개요 전체")
          )}
        </button>
      ) : null}
      {showSchedule && shownSchedule.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-lg font-bold">
            {edit ? (
              <InlineText
                value={String(overview.content.scheduleTitle ?? "")}
                placeholder={chromeText(chrome, "phScheduleTitle", "분양 일정")}
                onCommit={(value) => edit.patch(overview.id, { ...overview.content, scheduleTitle: value })}
              />
            ) : (
              String(overview.content.scheduleTitle ?? "").trim() || chromeText(chrome, "phScheduleTitle", "분양 일정")
            )}
          </h3>
          <ol className="mt-3 overflow-hidden rounded-[16px] border border-border bg-white">
            {shownSchedule.map(({ item, index }) => (
              <li key={`${overview.id}-glance-schedule-${index}`} className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0">
                <span className="font-semibold">
                  <InlineText
                    value={item.title}
                    placeholder={chromeText(chrome, "phSchedule", "일정")}
                    onCommit={edit ? (value) => setSchedule(schedule.map((row, rowIndex) => (rowIndex === index ? { ...row, title: value } : row))) : undefined}
                  />
                </span>
                <span className="text-right text-text-body">
                  <InlineText
                    value={item.date}
                    placeholder={chromeText(chrome, "phDate", "날짜")}
                    onCommit={edit ? (value) => setSchedule(schedule.map((row, rowIndex) => (rowIndex === index ? { ...row, date: value } : row))) : undefined}
                  />
                </span>
              </li>
            ))}
          </ol>
          {scheduleRows.length > 4 || edit ? (
            <button type="button" className="mt-3 text-sm font-semibold text-primary" onClick={(event) => {
              if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
              scrollToAnchor(overview.anchorId, event.currentTarget);
            }}>
              {edit ? (
                <InlineText
                  value={String(overview.content.scheduleMoreLabel ?? "")}
                  placeholder={chromeText(chrome, "phScheduleMore", "일정 전체")}
                  onCommit={(value) => edit.patch(overview.id, { ...overview.content, scheduleMoreLabel: value })}
                />
              ) : (
                String(overview.content.scheduleMoreLabel ?? "").trim() || chromeText(chrome, "phScheduleMore", "일정 전체")
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Hero({
  section,
  snapshot,
  layout,
  live,
  narrow,
}: {
  section: PageSection;
  snapshot: PageSnapshot;
  layout: "product" | "photo" | "forest" | "info";
  live: boolean;
  narrow: boolean;
}) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const content = section.content;
  const imageUrl = String(content.imageUrl ?? "");
  const mobileUrl = String(content.mobileImageUrl ?? "");
  const videoUrl = String(content.videoUrl ?? "");
  const posterUrl = String(content.posterUrl ?? "");
  const mediaMode = String(content.mediaMode ?? "image");
  const imageAlt = String(content.imageAlt ?? "").trim();
  const imageObjectPosition = String(content.imageObjectPosition ?? "center");
  const hasHeroMedia = Boolean(imageUrl || mobileUrl || (mediaMode === "video" && videoUrl));
  function emptyMedia() {
    const value = String(content.emptyMediaLabel ?? "");
    if (!edit) return value.trim() || chromeText(chrome, "phEmptyMedia", "대표 이미지를 올려 주세요");
    return <InlineText value={value} placeholder={chromeText(chrome, "phEmptyMedia", "대표 이미지를 올려 주세요")} onCommit={textCommit(section, "emptyMediaLabel", edit)} />;
  }
  if (layout === "forest") {
    return (
      <div className={cn("relative flex items-end overflow-hidden bg-primary-soft", narrow ? "min-h-96" : "min-h-[80vh]")}>
        {mediaMode === "video" && videoUrl ? (
          <HeroVideo
            videoUrl={videoUrl}
            posterUrl={posterUrl}
            imageUrl={imageUrl}
            mobileUrl={mobileUrl}
            narrow={narrow}
            imageAlt={imageAlt}
            objectPosition={imageObjectPosition}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <HeroPicture imageUrl={imageUrl} mobileUrl={mobileUrl} narrow={narrow} alt={imageAlt} objectPosition={imageObjectPosition} className="absolute inset-0 h-full w-full object-cover" />
        )}
        {hasHeroMedia ? <div className="absolute inset-0 bg-white/75" /> : null}
        {edit && !hasHeroMedia ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-text-muted">
            <span className="pointer-events-auto">{emptyMedia()}</span>
          </div>
        ) : null}
        <HeroImageButton section={section} imageUrl={imageUrl} />
        <HeroMediaControls section={section} />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16">
          <HeroRegion section={section} />
          <p className="mt-2 text-sm font-medium text-primary">
            <InlineText value={String(content.kicker ?? "")} placeholder={chromeText(chrome, "phKicker", "한 줄 소개")} onCommit={textCommit(section, "kicker", edit)} />
          </p>
          <h1 className={cn("mt-3 max-w-3xl font-bold leading-tight break-keep", narrow ? "text-4xl" : "text-5xl")}>
            <InlineText value={String(content.headline ?? snapshot.projectName)} placeholder={chromeText(chrome, "phSite", "현장명")} onCommit={edit?.setSiteName} />
          </h1>
          <p className="mt-4 max-w-xl text-lg text-text-body">
            <BoldCopy value={String(content.subheadline ?? "")} multiline placeholder={chromeText(chrome, "phSubheadline", "안내 문구")} hint onCommit={textCommit(section, "subheadline", edit)} />
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {live && externalFormUrl(snapshot) ? (
              <TrackedLink href={externalFormUrl(snapshot)} target="_blank" slug={snapshot.publicSlug} eventName="lead_cta_click" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white">
                {String(content.ctaLabel ?? "").trim() || chromeText(chrome, "phCta", "관심고객 등록")}
              </TrackedLink>
            ) : (
              <a href="#inquiry" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white" onClick={(event) => { if (!live) { event.preventDefault(); scrollToAnchor("inquiry", event.currentTarget); } }}>
                <InlineText value={String(content.ctaLabel ?? "")} placeholder={chromeText(chrome, "phCta", "관심고객 등록")} className="text-white" onCommit={textCommit(section, "ctaLabel", edit)} />
              </a>
            )}
            <HeroPhone section={section} snapshot={snapshot} live={live} />
          </div>
        </div>
      </div>
    );
  }
  if (layout === "info") {
    return (
      <div className="mx-auto max-w-6xl px-4 py-14">
        <HeroRegion section={section} />
        <p className="mt-2 text-sm font-medium text-primary">
          <InlineText value={String(content.kicker ?? "")} placeholder={chromeText(chrome, "phKicker", "한 줄 소개")} onCommit={textCommit(section, "kicker", edit)} />
        </p>
        <h1 className="mt-3 text-4xl font-bold break-keep">
          <InlineText value={String(content.headline ?? snapshot.projectName)} placeholder={chromeText(chrome, "phSite", "현장명")} onCommit={edit?.setSiteName} />
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-text-body">
          <BoldCopy value={String(content.subheadline ?? "")} multiline placeholder={chromeText(chrome, "phSubheadline", "안내 문구")} hint onCommit={textCommit(section, "subheadline", edit)} />
        </p>
        <PriceBox section={section} />
        {(edit || (String(content.priceLine ?? "").trim() && String(content.priceLine ?? "").trim() !== String(content.priceMain ?? "").trim())) ? (
          <p className="mt-3 text-text-body">
            <InlineText value={String(content.priceLine ?? "")} placeholder={chromeText(chrome, "phPriceLine", "분양가 한 줄")} onCommit={textCommit(section, "priceLine", edit)} />
          </p>
        ) : null}
        <OverviewGlance snapshot={snapshot} narrow={narrow} limit={6} showSchedule showStats />
        <div className="mt-6 flex flex-wrap gap-3">
          {live && externalFormUrl(snapshot) ? (
            <TrackedLink href={externalFormUrl(snapshot)} target="_blank" slug={snapshot.publicSlug} eventName="lead_cta_click" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white">
              {String(content.ctaLabel ?? "").trim() || chromeText(chrome, "phCta", "관심고객 등록")}
            </TrackedLink>
          ) : (
            <a href="#inquiry" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white" onClick={(event) => { if (!live) { event.preventDefault(); scrollToAnchor("inquiry", event.currentTarget); } }}>
              <InlineText value={String(content.ctaLabel ?? "")} placeholder={chromeText(chrome, "phCta", "관심고객 등록")} className="text-white" onCommit={textCommit(section, "ctaLabel", edit)} />
            </a>
          )}
          <HeroPhone section={section} snapshot={snapshot} live={live} />
        </div>
      </div>
    );
  }
  if (layout === "product") {
    return (
      <div className={cn("mx-auto grid max-w-6xl gap-8 px-4 py-10", !narrow && "lg:grid-cols-[1.1fr_0.9fr] lg:items-start")}>
        <div>
          <div className="relative aspect-square overflow-hidden bg-surface">
            {imageUrl || (narrow && mobileUrl) ? (
              <HeroPicture imageUrl={imageUrl} mobileUrl={mobileUrl} narrow={narrow} alt={imageAlt} objectPosition={imageObjectPosition} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-sm text-text-muted">{emptyMedia()}</div>
            )}
            <HeroImageButton section={section} imageUrl={imageUrl} />
          </div>
          <HeroThumbs hero={section} snapshot={snapshot} />
        </div>
        <div>
          <HeroRegion section={section} />
          <p className="mt-2 text-sm font-medium text-primary">
            <InlineText value={String(content.kicker ?? "")} placeholder={chromeText(chrome, "phKicker", "한 줄 소개")} onCommit={textCommit(section, "kicker", edit)} />
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight break-keep">
            <InlineText value={String(content.headline ?? snapshot.projectName)} placeholder={chromeText(chrome, "phSite", "현장명")} onCommit={edit?.setSiteName} />
          </h1>
          <p className="mt-3 text-text-body">
            <BoldCopy value={String(content.subheadline ?? "")} multiline placeholder={chromeText(chrome, "phSubheadline", "안내 문구")} hint onCommit={textCommit(section, "subheadline", edit)} />
          </p>
          <PriceBox section={section} />
          <div className="mt-6 flex flex-wrap gap-3">
            {live && externalFormUrl(snapshot) ? (
              <TrackedLink href={externalFormUrl(snapshot)} target="_blank" slug={snapshot.publicSlug} eventName="lead_cta_click" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white">
                {String(content.ctaLabel ?? "").trim() || chromeText(chrome, "phCta", "관심고객 등록")}
              </TrackedLink>
            ) : (
              <a href="#inquiry" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white" onClick={(event) => { if (!live) { event.preventDefault(); scrollToAnchor("inquiry", event.currentTarget); } }}>
                <InlineText value={String(content.ctaLabel ?? "")} placeholder={chromeText(chrome, "phCta", "관심고객 등록")} className="text-white" onCommit={textCommit(section, "ctaLabel", edit)} />
              </a>
            )}
            <HeroPhone section={section} snapshot={snapshot} live={live} />
          </div>
          <BenefitBar section={section} snapshot={snapshot} live={live} />
          <TrustTags section={section} />
          {edit ? (
            <p className="mt-3 text-xs text-text-muted">
              {externalFormUrl(snapshot) ? chromeText(chrome, "hintExternalOn", "등록 버튼은 저장된 외부 관심고객 주소로 이동합니다.") : chromeText(chrome, "hintExternalOff", "외부 관심고객 주소가 없으면 이 페이지의 등록 폼으로 이동합니다.")}
            </p>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white">
      <div className={cn("relative overflow-hidden bg-surface", narrow ? "min-h-80" : "min-h-[70vh]")}>
        {mediaMode === "video" && videoUrl ? (
          <HeroVideo
            videoUrl={videoUrl}
            posterUrl={posterUrl}
            imageUrl={imageUrl}
            mobileUrl={mobileUrl}
            narrow={narrow}
            imageAlt={imageAlt}
            objectPosition={imageObjectPosition}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : imageUrl || mobileUrl ? (
          <HeroPicture imageUrl={imageUrl} mobileUrl={mobileUrl} narrow={narrow} alt={imageAlt} objectPosition={imageObjectPosition} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-surface" />
        )}
        {edit && !hasHeroMedia ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-text-muted">
            <span className="pointer-events-auto">{emptyMedia()}</span>
          </div>
        ) : null}
        <HeroImageButton section={section} imageUrl={imageUrl} />
        <HeroMediaControls section={section} />
      </div>
      <div className="relative z-10 mx-auto -mt-16 max-w-3xl px-4">
        <div className="ui-card">
        <HeroRegion section={section} />
        <p className="mt-2 text-sm font-medium text-primary">
          <InlineText
            value={String(content.kicker ?? "")}
            placeholder={chromeText(chrome, "phKicker", "한 줄 소개")}
            onCommit={textCommit(section, "kicker", edit)}
          />
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight break-keep">
          <InlineText
            value={String(content.headline ?? snapshot.projectName)}
            placeholder={chromeText(chrome, "phSite", "현장명")}
            onCommit={edit?.setSiteName}
          />
        </h1>
        <p className="mt-4 text-lg text-text-body">
          <BoldCopy
            value={String(content.subheadline ?? "")}
            placeholder={chromeText(chrome, "phSubheadline", "안내 문구")}
            multiline
            hint
            onCommit={textCommit(section, "subheadline", edit)}
          />
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {live && externalFormUrl(snapshot) ? (
            <TrackedLink href={externalFormUrl(snapshot)} target="_blank" slug={snapshot.publicSlug} eventName="lead_cta_click" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white">
              {String(content.ctaLabel ?? "").trim() || chromeText(chrome, "phCta", "관심고객 등록")}
            </TrackedLink>
          ) : live ? (
            <TrackedLink href="#inquiry" slug={snapshot.publicSlug} eventName="lead_cta_click" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white">
              {String(content.ctaLabel ?? "").trim() || chromeText(chrome, "phCta", "관심고객 등록")}
            </TrackedLink>
          ) : (
            <a href="#inquiry" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white" onClick={(event) => { if (!live) { event.preventDefault(); scrollToAnchor("inquiry", event.currentTarget); } }}>
              <InlineText value={String(content.ctaLabel ?? "")} placeholder={chromeText(chrome, "phCta", "관심고객 등록")} className="text-white" onCommit={textCommit(section, "ctaLabel", edit)} />
            </a>
          )}
          <HeroPhone section={section} snapshot={snapshot} live={live} />
        </div>
        </div>
      </div>
    </div>
  );
}

function LocationGlyph({ icon }: { icon: LocationMatrixIcon }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (icon === "life") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" {...common} />
      </svg>
    );
  }
  if (icon === "school") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d="M3 10 12 5l9 5-9 5-9-5Z" {...common} />
        <path d="M7 12.5V17c1.6 1.3 3.6 2 5 2s3.4-.7 5-2v-4.5" {...common} />
      </svg>
    );
  }
  if (icon === "nature") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d="M12 21V11" {...common} />
        <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5Z" {...common} />
        <path d="M12 11c3 0 5-2 5-5-3 0-5 2-5 5Z" {...common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <rect x="3" y="8" width="14" height="8" rx="2" {...common} />
      <path d="M17 11h2.2a2 2 0 0 1 1.6.8L22 14v2h-5" {...common} />
      <circle cx="7.5" cy="16.5" r="1.4" {...common} />
      <circle cx="17.5" cy="16.5" r="1.4" {...common} />
    </svg>
  );
}

function OfficialLinks({ section, live }: { section: PageSection; live: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const links = [
    { key: "homepageUrl", labelKey: "homepageLabel", phKey: "phOfficialHome", fallback: "분양 홈페이지" },
    { key: "noticeUrl", labelKey: "noticeLabel", phKey: "phOfficialNotice", fallback: "입주자 모집공고" },
  ] as const;
  const visibleLinks = links.filter((link) => edit || httpUrl(String(section.content[link.key] ?? "")));
  if (visibleLinks.length === 0) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {visibleLinks.map((link) => {
        const raw = String(section.content[link.key] ?? "");
        const href = httpUrl(raw);
        const label = String(section.content[link.labelKey] ?? "");
        const fallback = chromeText(chrome, link.phKey, link.fallback);
        const shown = label.trim() || fallback;
        const buttonClass = "inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-5 text-[17px] font-semibold";
        const labelNode = edit ? (
          <InlineText value={label} placeholder={fallback} onCommit={textCommit(section, link.labelKey, edit)} />
        ) : (
          shown
        );
        return (
          <div key={link.key} className="min-w-0">
            {live && href ? (
              <a href={href} target="_blank" rel="noreferrer" className={buttonClass}>
                {shown}
              </a>
            ) : (
              <span className={buttonClass}>{labelNode}</span>
            )}
            {edit ? (
              <p className="mt-2 text-sm text-text-body">
                <InlineText value={raw} placeholder={chromeText(chrome, "phHttps", "https://")} onCommit={textCommit(section, link.key, edit)} />
                {raw.trim() && !href ? <span className="mt-1 block text-xs text-danger">{chromeText(chrome, "hintHttp", "http 또는 https 주소만 연결됩니다.")}</span> : null}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LocationMatrix({ section, narrow }: { section: PageSection; narrow: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const stored = locationMatrix(section.content as { matrix?: LocationMatrixItem[] });
  const rows = stored ?? LOCATION_MATRIX_DEFAULTS;
  const filled = rows.some((row) => row.label.trim() || row.body.trim());
  if (!edit && (!stored || !filled)) return null;
  function save(next: LocationMatrixItem[]) {
    edit?.patch(section.id, { ...section.content, matrix: next });
  }
  return (
    <div className={cn("mt-8 grid gap-4", narrow ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4")}>
      {rows.map((row, index) => (
        <div key={`${section.id}-matrix-${index}`} className="rounded-[16px] border border-border bg-white p-4">
          <div className="flex items-center gap-2 text-primary">
            {edit ? (
              <button
                type="button"
                className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft"
                aria-label={chromeText(chrome, "ariaIconChange", "아이콘 바꾸기")}
                onClick={() => {
                  const iconIndex = LOCATION_MATRIX_ICONS.indexOf(row.icon);
                  const icon = LOCATION_MATRIX_ICONS[(iconIndex + 1) % LOCATION_MATRIX_ICONS.length] ?? "transit";
                  save(rows.map((item, itemIndex) => (itemIndex === index ? { ...item, icon } : item)));
                }}
              >
                <LocationGlyph icon={row.icon} />
              </button>
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft">
                <LocationGlyph icon={row.icon} />
              </span>
            )}
          </div>
          <h3 className="mt-3 text-lg font-semibold">
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
  );
}

function OverviewStats({ section, narrow }: { section: PageSection; narrow: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const stats = ((section.content.stats as Array<{ value?: string; label?: string }> | undefined) ?? [])
    .slice(0, 4)
    .map((item) => ({ value: String(item.value ?? ""), label: String(item.label ?? "") }));
  const visible = stats.filter((item) => edit || item.value.trim() || item.label.trim());
  if (visible.length === 0) return null;
  function setStats(next: Array<{ value: string; label: string }>) {
    edit?.patch(section.id, { ...section.content, stats: next.slice(0, 4) });
  }
  return (
    <div className={cn("mt-8 grid grid-cols-2 gap-3", !narrow && "lg:grid-cols-4")}>
      {visible.map((item, index) => (
        <div key={`${section.id}-stat-${index}`} className="rounded-[16px] border border-border px-4 py-5">
          <p className="text-2xl font-bold text-primary">
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
          {edit && stats.length > 1 ? (
            <div className="mt-2 flex gap-3">
              <button type="button" className="text-xs text-text-body disabled:text-text-muted" disabled={index === 0} onClick={() => {
                const next = [...stats];
                const [row] = next.splice(index, 1);
                if (!row) return;
                next.splice(index - 1, 0, row);
                setStats(next);
              }}>{chromeText(chrome, "editForward", "앞으로")}</button>
              <button type="button" className="text-xs text-text-body disabled:text-text-muted" disabled={index === stats.length - 1} onClick={() => {
                const next = [...stats];
                const [row] = next.splice(index, 1);
                if (!row) return;
                next.splice(index + 1, 0, row);
                setStats(next);
              }}>{chromeText(chrome, "editBack", "뒤로")}</button>
              <button type="button" className="text-xs text-text-muted" onClick={() => setStats(stats.filter((_, rowIndex) => rowIndex !== index))}>
                {chromeText(chrome, "editRemove", "삭제")}
              </button>
            </div>
          ) : null}
        </div>
      ))}
      {edit && stats.length < 4 ? (
        <button type="button" className="rounded-[16px] border border-dashed border-border px-4 text-sm font-semibold text-primary" onClick={() => setStats([...stats, { value: chromeText(chrome, "seedStatValue", "입력"), label: chromeText(chrome, "seedStatLabel", "항목") }])}>
          {chromeText(chrome, "editAddStat", "수치 추가")}
        </button>
      ) : null}
    </div>
  );
}

function Overview({ section, narrow, live }: { section: PageSection; stacked: boolean; narrow: boolean; live: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const facts = (section.content.facts as Array<{ label: string; value: string }>) ?? [];
  const schedule = ((section.content.schedule as Array<{ title?: string; date?: string; note?: string }>) ?? []).map((item) => ({
    title: String(item.title ?? ""),
    date: String(item.date ?? ""),
    note: String(item.note ?? ""),
  }));
  const visibleSchedule = edit ? schedule : schedule.filter((item) => item.title.trim() || item.date.trim() || item.note.trim());
  function setFacts(next: Array<{ label: string; value: string }>) {
    edit?.patch(section.id, { ...section.content, facts: next });
  }
  function setSchedule(next: Array<{ title: string; date: string; note: string }>) {
    edit?.patch(section.id, { ...section.content, schedule: next.slice(0, 8) });
  }
  return (
    <div className="mx-auto max-w-6xl border-b border-border px-4 py-14">
      <SectionEyebrow section={section} />
      <h2 className="mt-2 text-3xl font-bold break-keep">
        <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
      </h2>
      {(edit || String(section.content.body ?? "").trim()) ? (
      <p className="mt-4 max-w-3xl text-text-body">
        <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
      </p>
      ) : null}
      <OverviewStats section={section} narrow={narrow} />
      {(edit || facts.some((fact) => fact.label.trim() || fact.value.trim())) ? (
      <div className="mt-8 overflow-hidden rounded-[16px] border border-border bg-white">
        {facts.map((fact, index) => edit || fact.label.trim() || fact.value.trim() ? (
          <div key={`${section.id}-fact-${index}`} className={cn("grid border-b border-border last:border-b-0", narrow ? "grid-cols-1" : "grid-cols-[11rem_1fr]")}>
            <div className="border-r border-border bg-surface px-4 py-3.5 text-sm font-medium text-text-muted">
              <InlineText
                value={fact.label}
                placeholder={chromeText(chrome, "phItem", "항목")}
                onCommit={edit ? (value) => setFacts(facts.map((item, itemIndex) => (itemIndex === index ? { ...item, label: value } : item))) : undefined}
              />
            </div>
            <div className="flex items-start justify-between gap-3 px-4 py-3.5">
              <p className="font-semibold">
                <InlineText
                  value={fact.value}
                  placeholder={chromeText(chrome, "phContent", "내용")}
                  onCommit={edit ? (value) => setFacts(facts.map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item))) : undefined}
                />
              </p>
              {edit && facts.length > 1 ? (
                <div className="flex shrink-0 gap-3">
                  <button type="button" className="text-xs text-text-body disabled:text-text-muted" disabled={index === 0} onClick={() => {
                    const next = [...facts];
                    const [row] = next.splice(index, 1);
                    if (!row) return;
                    next.splice(index - 1, 0, row);
                    setFacts(next);
                  }}>{chromeText(chrome, "editUp", "위로")}</button>
                  <button type="button" className="text-xs text-text-body disabled:text-text-muted" disabled={index === facts.length - 1} onClick={() => {
                    const next = [...facts];
                    const [row] = next.splice(index, 1);
                    if (!row) return;
                    next.splice(index + 1, 0, row);
                    setFacts(next);
                  }}>{chromeText(chrome, "editDown", "아래로")}</button>
                  <button type="button" className="text-xs text-text-muted" onClick={() => setFacts(facts.filter((_, itemIndex) => itemIndex !== index))}>
                    {chromeText(chrome, "editRemove", "삭제")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null)}
      </div>
      ) : null}
      {edit && facts.length < 20 ? (
        <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setFacts([...facts, { label: chromeText(chrome, "seedFactLabel", "항목"), value: chromeText(chrome, "seedFactValue", "내용") }])}>
          {chromeText(chrome, "editAddItem", "항목 추가")}
        </button>
      ) : null}
      {(edit || String(section.content.disclaimer ?? "").trim()) ? (
        <p className="mt-4 text-sm text-text-muted">
          <BoldCopy value={String(section.content.disclaimer ?? "")} multiline onCommit={textCommit(section, "disclaimer", edit)} placeholder={chromeText(chrome, "phDisclaimer", "하단 안내")} />
        </p>
      ) : null}
      <OfficialLinks section={section} live={live} />
      {visibleSchedule.length > 0 || edit ? (
        <div className="mt-12">
          <h3 className="text-xl font-bold">
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
              <li key={`${section.id}-schedule-${index}`} className="flex gap-4 border-b border-border py-4 last:border-b-0">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className={cn("flex gap-3", narrow ? "flex-col" : "items-start justify-between")}>
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
                  {edit ? (
                    <div className="mt-2 flex gap-3 text-xs text-text-muted">
                      <button type="button" className="disabled:text-text-muted" disabled={index === 0} onClick={() => {
                        const next = [...schedule];
                        const [row] = next.splice(index, 1);
                        if (!row) return;
                        next.splice(index - 1, 0, row);
                        setSchedule(next);
                      }}>{chromeText(chrome, "editUp", "위로")}</button>
                      <button type="button" className="disabled:text-text-muted" disabled={index === schedule.length - 1} onClick={() => {
                        const next = [...schedule];
                        const [row] = next.splice(index, 1);
                        if (!row) return;
                        next.splice(index + 1, 0, row);
                        setSchedule(next);
                      }}>{chromeText(chrome, "editDown", "아래로")}</button>
                      <button type="button" onClick={() => setSchedule(schedule.filter((_, rowIndex) => rowIndex !== index))}>{chromeText(chrome, "editRemove", "삭제")}</button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          {edit && schedule.length < 8 ? (
            <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setSchedule([...schedule, { title: chromeText(chrome, "seedScheduleTitle", "일정"), date: chromeText(chrome, "seedScheduleDate", "날짜를 입력하세요"), note: "" }])}>
              {chromeText(chrome, "editAddSchedule", "일정 추가")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Cards({ section, timeline, narrow }: { section: PageSection; timeline: boolean; narrow: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const cards = (section.content.cards as Array<{ title: string; body: string; imageUrl?: string }>) ?? [];
  function setCards(next: Array<{ title: string; body: string; imageUrl?: string }>) {
    edit?.patch(section.id, { ...section.content, cards: next });
  }
  const slides = cards.flatMap((card) => (card.imageUrl ? [{ url: card.imageUrl, alt: card.title }] : []));
  const [photo, setPhoto] = useState<number | null>(null);
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <SectionEyebrow section={section} />
        <h2 className="mt-2 text-3xl font-bold break-keep">
          <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
        </h2>
        {(edit || String(section.content.body ?? "").trim()) ? (
        <p className="mt-4 max-w-3xl text-text-body">
          <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
        </p>
        ) : null}
        {(edit || ((section.content.images as Array<{ url?: string }>) ?? []).some((image) => image.url)) ? (
          <div className="mt-8">
            <ThumbGallery
              images={(section.content.images as Array<{ url?: string; alt: string }>) ?? []}
              upload={edit?.upload}
              captionOnImage
              onCommit={edit ? (next) => edit.patch(section.id, { ...section.content, images: next }) : undefined}
            />
          </div>
        ) : null}
        <LocationMatrix section={section} narrow={narrow} />
        <div className={cn("mt-10 grid gap-4", !narrow && (timeline ? "lg:grid-cols-1" : "lg:grid-cols-3"))}>
          {cards.map((card, index) => (
            <div key={`${section.id}-card-${index}`} className="ui-card">
              {card.imageUrl && !edit ? (
                <button type="button" className="mb-4 block w-full" onClick={() => setPhoto(slides.findIndex((slide) => slide.url === card.imageUrl))}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={card.imageUrl} alt={card.title} className="h-40 w-full rounded-[8px] object-cover" />
                </button>
              ) : card.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.imageUrl} alt={card.title} className="mb-4 h-40 w-full rounded-[8px] object-cover" />
              ) : null}
              {timeline ? <p className="text-sm text-primary">0{index + 1}</p> : null}
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
                <div className="mt-3 flex gap-3 text-xs">
                  <label className="cursor-pointer font-medium text-primary">
                    {chromeText(chrome, "phPhoto", "사진")}
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
                  {card.imageUrl ? (
                    <button type="button" className="text-text-muted" onClick={() => setCards(cards.map((item, itemIndex) => (itemIndex === index ? { ...item, imageUrl: "" } : item)))}>
                      {chromeText(chrome, "mediaPhotoDelete", "사진 삭제")}
                    </button>
                  ) : null}
                  <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === 0} onClick={() => {
                    const next = [...cards];
                    const [item] = next.splice(index, 1);
                    if (!item) return;
                    next.splice(index - 1, 0, item);
                    setCards(next);
                  }}>
                    {chromeText(chrome, "editForward", "앞으로")}
                  </button>
                  <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === cards.length - 1} onClick={() => {
                    const next = [...cards];
                    const [item] = next.splice(index, 1);
                    if (!item) return;
                    next.splice(index + 1, 0, item);
                    setCards(next);
                  }}>
                    {chromeText(chrome, "editBack", "뒤로")}
                  </button>
                  <button type="button" className="text-text-muted" onClick={() => setCards(cards.filter((_, itemIndex) => itemIndex !== index))}>
                    {chromeText(chrome, "editRemove", "삭제")}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {edit ? (
          <button type="button" className="mt-4 text-sm font-medium text-primary" onClick={() => setCards([...cards, { title: chromeText(chrome, "seedCardTitle", "항목"), body: chromeText(chrome, "seedCardBody", "내용을 입력하세요.") }])}>
            {chromeText(chrome, "editAddItem", "항목 추가")}
          </button>
        ) : null}
      </div>
      {photo !== null && slides.length > 0 ? <PhotoViewer images={slides} index={Math.max(0, photo)} onIndex={setPhoto} onClose={() => setPhoto(null)} /> : null}
    </div>
  );
}

function PremiumGlyph({ icon }: { icon: PremiumIcon }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (icon === "park") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d="M12 21V11" {...common} />
        <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5Z" {...common} />
        <path d="M12 11c3 0 5-2 5-5-3 0-5 2-5 5Z" {...common} />
      </svg>
    );
  }
  if (icon === "parking") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <rect x="4" y="3" width="16" height="18" rx="2" {...common} />
        <path d="M9 17V7h4.2a3 3 0 0 1 0 6H9" {...common} />
      </svg>
    );
  }
  if (icon === "view") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z" {...common} />
        <circle cx="12" cy="12" r="2.5" {...common} />
      </svg>
    );
  }
  if (icon === "transit") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <rect x="6" y="3" width="12" height="14" rx="3" {...common} />
        <path d="M8 20h8M9 17l-2 3M15 17l2 3M8 10h8" {...common} />
      </svg>
    );
  }
  if (icon === "school") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d="M3 10 12 5l9 5-9 5-9-5Z" {...common} />
        <path d="M7 12.5V17c1.6 1.3 3.6 2 5 2s3.4-.7 5-2v-4.5" {...common} />
      </svg>
    );
  }
  if (icon === "security") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d="M12 3 5 6v6c0 4.2 2.8 6.8 7 8 4.2-1.2 7-3.8 7-8V6l-7-3Z" {...common} />
        <path d="m9 12 2 2 4-4" {...common} />
      </svg>
    );
  }
  if (icon === "home") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" {...common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
      <path d="M4 20V9l8-5 8 5v11" {...common} />
      <path d="M9 20v-6h6v6" {...common} />
    </svg>
  );
}

function Premium({ section, magazine, narrow }: { section: PageSection; magazine: boolean; narrow: boolean }) {
  const chrome = useEditorChrome();
  const edit = useCanvasEdit();
  const items = premiumItems(section.content.items);
  function setItems(next: PremiumItem[]) {
    edit?.patch(section.id, { ...section.content, items: next.slice(0, PREMIUM_ITEM_MAX) });
  }
  const slides = items.flatMap((item) => (item.imageUrl ? [{ url: item.imageUrl, alt: item.title }] : []));
  const [photo, setPhoto] = useState<number | null>(null);
  return (
    <div className="mx-auto max-w-6xl px-4 py-20">
      <SectionEyebrow section={section} />
      <h2 className="mt-2 text-3xl font-bold break-keep">
        <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
      </h2>
      {(edit || String(section.content.body ?? "").trim()) ? (
        <p className="mt-4 max-w-3xl text-text-body">
          <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
        </p>
      ) : null}
      {(edit || String(section.content.copyHeadline ?? "").trim()) ? (
        <h3 className="mt-8 text-2xl font-bold break-keep">
          {edit ? (
            <InlineText
              value={String(section.content.copyHeadline ?? "")}
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
          {edit ? (
            <InlineText
              value={String(section.content.copyBody ?? "")}
              multiline
              placeholder={chromeText(chrome, "phEmphasisBody", "강조 설명")}
              onCommit={(value) => edit.patch(section.id, { ...section.content, copyBody: value })}
            />
          ) : (
            <MarkedText text={String(section.content.copyBody ?? "")} />
          )}
        </p>
      ) : null}
      {edit || ((section.content.images as Array<{ url?: string }>) ?? []).some((image) => image.url) ? (
        <div className="mt-8">
          <ThumbGallery
            images={(section.content.images as Array<{ url?: string; alt: string }>) ?? []}
            upload={edit?.upload}
            onCommit={edit ? (next) => edit.patch(section.id, { ...section.content, images: next }) : undefined}
          />
        </div>
      ) : null}
      {(edit || String(section.content.galleryCaption ?? "").trim()) ? (
        <p className="mt-3 text-sm text-text-muted">
          <InlineText
            value={String(section.content.galleryCaption ?? "")}
            placeholder={chromeText(chrome, "phPhotoCaption", "사진 설명")}
            onCommit={edit ? (value) => edit.patch(section.id, { ...section.content, galleryCaption: value }) : undefined}
          />
        </p>
      ) : null}
      {edit ? <p className="mt-2 text-xs text-text-muted">{chromeText(chrome, "hintPremium", `**이렇게** 감싸면 공개 페이지에서 굵게 보입니다. 특장점은 최대 ${PREMIUM_ITEM_MAX}개입니다.`)}</p> : null}
      <div className={cn("mt-10 grid gap-6", !narrow && (magazine ? "lg:grid-cols-2" : "lg:grid-cols-3"))}>
        {items.map((item, index) => (
          <div key={`${section.id}-item-${index}`} className="overflow-hidden rounded-[16px] border border-border">
            {item.imageUrl && !edit ? (
              <button type="button" className="block w-full" onClick={() => setPhoto(slides.findIndex((slide) => slide.url === item.imageUrl))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt={item.title} className="h-44 w-full object-cover" />
              </button>
            ) : item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.title} className="h-44 w-full object-cover" />
            ) : null}
            <div className={cn("p-6", magazine && !item.imageUrl && "min-h-48")}>
              {edit ? (
                <button
                  type="button"
                  className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft text-primary"
                  aria-label={chromeText(chrome, "ariaIconChange", "아이콘 바꾸기")}
                  onClick={() => {
                    const iconIndex = PREMIUM_ICONS.indexOf(item.icon);
                    const icon = PREMIUM_ICONS[(iconIndex + 1) % PREMIUM_ICONS.length] ?? "community";
                    setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, icon } : row)));
                  }}
                >
                  <PremiumGlyph icon={item.icon} />
                </button>
              ) : (
                <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary-soft text-primary">
                  <PremiumGlyph icon={item.icon} />
                </span>
              )}
              <h3 className="text-xl font-semibold">
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
                {edit ? (
                  <InlineText
                    value={item.body}
                    multiline
                    placeholder={chromeText(chrome, "phContent", "내용")}
                    onCommit={(value) => setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, body: value } : row)))}
                  />
                ) : (
                  <MarkedText text={item.body} />
                )}
              </p>
              {edit ? (
                <div className="mt-3 flex gap-3 text-xs">
                  <label className="cursor-pointer font-medium text-primary">
                    {chromeText(chrome, "phPhoto", "사진")}
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
                  {item.imageUrl ? (
                    <button type="button" className="text-text-muted" onClick={() => setItems(items.map((row, itemIndex) => (itemIndex === index ? { ...row, imageUrl: "" } : row)))}>
                      {chromeText(chrome, "mediaPhotoDelete", "사진 삭제")}
                    </button>
                  ) : null}
                  <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === 0} onClick={() => {
                    const next = [...items];
                    const [row] = next.splice(index, 1);
                    if (!row) return;
                    next.splice(index - 1, 0, row);
                    setItems(next);
                  }}>
                    {chromeText(chrome, "editForward", "앞으로")}
                  </button>
                  <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === items.length - 1} onClick={() => {
                    const next = [...items];
                    const [row] = next.splice(index, 1);
                    if (!row) return;
                    next.splice(index + 1, 0, row);
                    setItems(next);
                  }}>
                    {chromeText(chrome, "editBack", "뒤로")}
                  </button>
                  <button type="button" className="text-text-muted disabled:text-text-muted" disabled={items.length <= 1} onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))}>
                    {chromeText(chrome, "editRemove", "삭제")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {edit && items.length < PREMIUM_ITEM_MAX ? (
        <button
          type="button"
          className="mt-4 text-sm font-medium text-primary"
          onClick={() => setItems([...items, { icon: PREMIUM_ICONS[items.length % PREMIUM_ICONS.length] ?? "community", title: chromeText(chrome, "seedPremiumTitle", "특장점"), body: chromeText(chrome, "seedPremiumBody", "내용을 입력하세요."), imageUrl: "" }])}
        >
          {chromeText(chrome, "editAddItem", "항목 추가")}
        </button>
      ) : null}
      {photo !== null && slides.length > 0 ? <PhotoViewer images={slides} index={Math.max(0, photo)} onIndex={setPhoto} onClose={() => setPhoto(null)} /> : null}
    </div>
  );
}

function HeroThumbs({ hero, snapshot }: { hero: PageSection; snapshot: PageSnapshot }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const gallery = snapshot.sections.find((item) => item.sectionType === "gallery" && item.isVisible);
  const images = (gallery?.content.images as Array<{ url?: string; alt?: string }>) ?? [];
  const heroUrl = String(hero.content.imageUrl ?? "");
  const slots = images.length > 0 ? images : edit ? [{ url: "" }, { url: "" }, { url: "" }, { url: "" }] : [];
  if (!gallery || slots.length === 0) return null;

  function choose(url: string) {
    if (!url) return;
    edit?.patch(hero.id, { ...hero.content, imageUrl: url, mediaMode: "image" });
  }

  function add(file: File) {
    if (!edit || !gallery) return;
    void edit.upload(file).then((url) => {
      if (!url) return;
      const next = [...images.filter((image) => image.url), { url, alt: chromeText(chrome, "phImageEmpty", "이미지") }].slice(0, GALLERY_IMAGE_MAX);
      edit.patch(gallery.id, { ...gallery.content, images: next });
      edit.patch(hero.id, { ...hero.content, imageUrl: url, mediaMode: "image" });
    }).catch(() => undefined);
  }

  return (
    <div className="mt-3 flex gap-2 overflow-x-auto">
      {slots.map((image, index) =>
        image.url ? (
          <button
            key={`${image.url}-${index}`}
            type="button"
            className={`h-16 w-24 shrink-0 overflow-hidden rounded-[8px] border ${heroUrl === image.url ? "border-primary" : "border-border"}`}
            onClick={() => choose(image.url!)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt ?? ""} className="h-full w-full object-cover" />
          </button>
        ) : (
          <div key={`empty-${index}`} className="h-16 w-24 shrink-0 rounded-[8px] border border-border bg-surface" />
        ),
      )}
      {edit && gallery && images.filter((image) => image.url).length < GALLERY_IMAGE_MAX ? (
        <label className="flex h-16 w-24 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-dashed border-border text-xs font-semibold text-text-body">
          {chromeText(chrome, "editAddShort", "추가")}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) add(file);
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

function ContactDock({ snapshot, live, compact }: { snapshot: PageSnapshot; live: boolean; compact: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const [open, setOpen] = useState(false);
  const phone = snapshot.phone.trim();
  const hero = snapshot.sections.find((section) => section.sectionType === "hero");
  const cta = String(hero?.content.ctaLabel ?? snapshot.globalSettings.ctaLabel ?? "").trim() || chromeText(chrome, "phCta", "관심고객 등록");
  const dockLabel = String(hero?.content.dockLabel ?? "").trim() || chromeText(chrome, "phDock", "분양문의");
  const dockCloseLabel = String(hero?.content.dockCloseLabel ?? "").trim() || chromeText(chrome, "shellPopupClosePh", "닫기");
  const phoneLabel = String(hero?.content.phoneLabel ?? "").trim() || chromeText(chrome, "phPhoneCaption", "문의번호");
  useEffect(() => {
    if (!compact) setOpen(false);
  }, [compact]);
  useEffect(() => {
    if (!compact || !open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [compact, open]);
  if (edit) return null;
  const register = live && externalFormUrl(snapshot) ? (
    <TrackedLink href={externalFormUrl(snapshot)} target="_blank" slug={snapshot.publicSlug} eventName="lead_cta_click" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white">
      {cta}
    </TrackedLink>
  ) : live ? (
    <TrackedLink href="#inquiry" slug={snapshot.publicSlug} eventName="lead_cta_click" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white">
      {cta}
    </TrackedLink>
  ) : (
    <a
      href="#inquiry"
      className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white"
      onClick={(event) => {
        event.preventDefault();
        scrollToAnchor("inquiry", event.currentTarget);
      }}
    >
      {cta}
    </a>
  );
  return (
    <>
      {compact && open ? (
        <button type="button" className="fixed inset-0 z-30 bg-text-primary/40" aria-label={chromeText(chrome, "ariaDockClose", "문의 닫기")} onClick={() => setOpen(false)} />
      ) : null}
      <div className="pointer-events-none sticky top-[calc(100%-5.5rem)] z-40 h-0">
        <div className="pointer-events-none absolute right-6 flex flex-col items-end gap-2">
          {compact && !open ? (
            <button type="button" className="pointer-events-auto inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-sm font-semibold text-white" aria-expanded={false} onClick={() => setOpen(true)}>
              {dockLabel}
            </button>
          ) : (
            <div className="pointer-events-auto flex items-center gap-2 rounded-[16px] border border-border bg-white p-2">
              {phone ? (
                <div className="px-2 text-right leading-tight">
                  <p className="text-xs text-text-muted">{phoneLabel}</p>
                  {live && phoneHref(phone) ? (
                    <TrackedLink href={phoneHref(phone)} slug={snapshot.publicSlug} eventName="phone_click" className="text-sm font-semibold">
                      {phone}
                    </TrackedLink>
                  ) : (
                    <p className="text-sm font-semibold">{phone}</p>
                  )}
                </div>
              ) : null}
              {register}
              {compact ? (
                <button type="button" className="px-2 text-sm text-text-muted" onClick={() => setOpen(false)}>
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

function VisitPopup({
  snapshot,
  forced = false,
  live = false,
  onClose,
}: {
  snapshot: PageSnapshot;
  forced?: boolean;
  live?: boolean;
  onClose?: () => void;
}) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const popup = (snapshot.globalSettings.popup ?? {}) as {
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
  const form = snapshot.sections.find((section) => section.sectionType === "lead_form");
  const [open, setOpen] = useState(forced);
  const [hideToday, setHideToday] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const perkSource = (popup.perks ?? []).slice(0, 8);
  const perks = edit ? perkSource : perkSource.map((item) => item.trim()).filter(Boolean);
  const phone = (popup.phone || snapshot.phone).trim();
  const cta = popup.ctaLabel?.trim() || chromeText(chrome, "phCta", "관심고객 등록");
  useEffect(() => {
    if (forced || !popup.enabled) return;
    if (popupHiddenToday(snapshot.publicSlug)) return;
    setOpen(true);
  }, [forced, popup.enabled, snapshot.publicSlug]);
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
  function savePopup(patch: Record<string, unknown>) {
    edit?.setPopup({ ...popup, ...patch });
  }
  function setPerks(next: string[]) {
    savePopup({ perks: next.slice(0, 8) });
  }
  const bannerAlt =
    String(popup.banner ?? "").trim() ||
    String(popup.title ?? "").trim() ||
    chromeText(chrome, "shellPopupEmptyPh", "배너 이미지");
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-text-primary/40 p-4" onClick={edit ? undefined : close}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visit-popup-title"
        className="my-6 w-full max-w-md overflow-hidden rounded-[16px] border border-border bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative">
          {popup.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={popup.imageUrl} alt={bannerAlt} className="h-44 w-full object-cover" />
          ) : (
            <div className="flex h-24 items-center justify-center bg-primary-soft px-4 text-center text-sm text-primary">
              {edit ? (
                <InlineText value={String(popup.emptyImageLabel ?? "")} placeholder={chromeText(chrome, "shellPopupEmptyPh", "배너 이미지")} onCommit={(value) => savePopup({ emptyImageLabel: value })} />
              ) : (
                String(popup.emptyImageLabel ?? "").trim() || chromeText(chrome, "shellPopupEmptyPh", "배너 이미지")
              )}
            </div>
          )}
          <button
            ref={closeRef}
            type="button"
            className="absolute right-3 top-3 inline-flex h-12 items-center rounded-[14px] bg-white px-4 text-sm font-semibold"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
              close();
            }}
          >
            {edit ? (
              <InlineText value={String(popup.closeLabel ?? "")} placeholder={chromeText(chrome, "shellPopupClosePh", "닫기")} onCommit={(value) => savePopup({ closeLabel: value })} />
            ) : (
              String(popup.closeLabel ?? "").trim() || chromeText(chrome, "shellPopupClosePh", "닫기")
            )}
          </button>
        </div>
        <div className="px-6 py-6">
          {(edit || popup.banner) ? (
            <p className="text-sm font-semibold text-primary">
              <InlineText value={popup.banner ?? ""} placeholder={chromeText(chrome, "shellPopupBannerPh", "배너 문구")} onCommit={edit ? (value) => savePopup({ banner: value }) : undefined} />
            </p>
          ) : null}
          <h2 id="visit-popup-title" className="mt-2 whitespace-pre-wrap text-2xl font-bold break-keep">
            <InlineText value={popup.title || (edit ? "" : chromeText(chrome, "shellPopupTitlePh", "관심고객으로 등록해 주세요"))} placeholder={chromeText(chrome, "shellPopupTitlePh", "관심고객으로 등록해 주세요")} onCommit={edit ? (value) => savePopup({ title: value }) : undefined} />
          </h2>
          {(edit || popup.body) ? (
            <p className="mt-3 whitespace-pre-wrap text-text-body">
              <BoldCopy value={popup.body ?? ""} multiline placeholder={chromeText(chrome, "formBodyPh", "본문")} onCommit={edit ? (value) => savePopup({ body: value }) : undefined} />
            </p>
          ) : null}
          {perks.length > 0 || edit ? (
            <ul className="mt-4 space-y-2">
              {perks.map((perk, index) => (
                <li key={`popup-perk-${index}`} className="flex items-start gap-2 text-sm text-text-body">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">✓</span>
                  <InlineText value={perk} placeholder={chromeText(chrome, "formPerkItemPh", "혜택")} onCommit={edit ? (value) => setPerks(perkSource.map((item, itemIndex) => (itemIndex === index ? value : item))) : undefined} />
                  {edit ? (
                    <span className="flex shrink-0 gap-2 text-xs">
                      <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === 0} onClick={() => {
                        const next = [...perkSource];
                        const [row] = next.splice(index, 1);
                        if (row === undefined) return;
                        next.splice(index - 1, 0, row);
                        setPerks(next);
                      }}>{chromeText(chrome, "editBefore", "앞")}</button>
                      <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === perkSource.length - 1} onClick={() => {
                        const next = [...perkSource];
                        const [row] = next.splice(index, 1);
                        if (row === undefined) return;
                        next.splice(index + 1, 0, row);
                        setPerks(next);
                      }}>{chromeText(chrome, "editAfter", "뒤")}</button>
                      <button type="button" className="text-text-muted" onClick={() => setPerks(perkSource.filter((_, itemIndex) => itemIndex !== index))}>{chromeText(chrome, "editRemove", "삭제")}</button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {edit && perkSource.length < 8 ? (
            <button type="button" className="mt-3 text-sm font-semibold text-primary" onClick={() => setPerks([...perkSource, chromeText(chrome, "formPerkItemPh", "혜택")])}>
              {chromeText(chrome, "editAddPerk", "혜택 추가")}
            </button>
          ) : null}
          {(edit || popup.disclaimer) ? <p className="mt-4 text-xs text-text-muted"><BoldCopy value={popup.disclaimer ?? ""} placeholder={chromeText(chrome, "shellPopupDisclaimerPh", "안내 문장")} onCommit={edit ? (value) => savePopup({ disclaimer: value }) : undefined} /></p> : null}
          {edit ? (
            <label className="mt-4 block cursor-pointer text-sm font-semibold text-primary">
              {chromeText(chrome, "shellPopupEmptyPh", "배너 이미지")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  void edit.upload(file).then((url) => savePopup({ imageUrl: url })).catch(() => undefined);
                }}
              />
            </label>
          ) : null}
          {edit && popup.imageUrl ? (
            <button type="button" className="mt-2 block text-xs text-text-muted" onClick={() => savePopup({ imageUrl: "" })}>
              {chromeText(chrome, "mediaBannerDelete", "배너 삭제")}
            </button>
          ) : null}
          {edit ? (
            <p className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-primary text-[17px] font-semibold text-white">
              <InlineText value={popup.ctaLabel ?? ""} placeholder={chromeText(chrome, "phCta", "관심고객 등록")} className="text-white" onCommit={(value) => savePopup({ ctaLabel: value })} />
            </p>
          ) : (
            <button
              type="button"
              className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-primary text-[17px] font-semibold text-white"
              onClick={(event) => register(event.currentTarget)}
            >
              {cta}
            </button>
          )}
          {edit || phone ? (
            <p className="mt-3 text-center text-sm text-text-body">
              {edit ? (
                <InlineText value={String(popup.phonePrefix ?? "")} placeholder={chromeText(chrome, "shellPopupPhonePrefixPh", "바로 상담")} onCommit={(value) => savePopup({ phonePrefix: value })} />
              ) : (
                String(popup.phonePrefix ?? "").trim() || chromeText(chrome, "shellPopupPhonePrefixPh", "바로 상담")
              )}{" "}
              {edit ? (
                <InlineText value={popup.phone ?? ""} placeholder={chromeText(chrome, "formPhoneEmptyPh", "비우면 대표 전화")} onCommit={(value) => savePopup({ phone: value })} />
              ) : live && phoneHref(phone) ? (
                <a href={phoneHref(phone)} className="font-semibold text-primary">{phone}</a>
              ) : (
                <span className="font-semibold">{phone}</span>
              )}
            </p>
          ) : null}
          <label className="mt-4 flex items-center gap-2 text-sm text-text-body">
            <input type="checkbox" checked={hideToday} onChange={(event) => setHideToday(event.target.checked)} />
            {edit ? (
              <span onClick={(event) => event.preventDefault()}>
                <InlineText value={popup.hideTodayLabel ?? ""} placeholder={chromeText(chrome, "shellPopupHideTodayPh", "오늘 하루 보지 않기")} onCommit={(value) => savePopup({ hideTodayLabel: value })} />
              </span>
            ) : (
              popup.hideTodayLabel?.trim() || chromeText(chrome, "shellPopupHideTodayPh", "오늘 하루 보지 않기")
            )}
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
  images: Array<{ url: string; alt: string }>;
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const labels = useContext(ViewerLabelsContext);
  const edit = useCanvasEdit();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const current = images[index];
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
        aria-label={current.alt || "사진 보기"}
        className="w-full max-w-4xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.url} alt={current.alt || "사진"} className="max-h-[70vh] w-full rounded-[16px] bg-white object-contain" />
        {current.alt ? <p className="mt-3 text-center text-sm text-white">{current.alt}</p> : null}
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
  images: Array<{ url?: string; alt: string }>;
  onCommit?: (images: Array<{ url?: string; alt: string }>) => void;
  upload?: (file: File) => Promise<string | null>;
  representative?: boolean;
  captionOnImage?: boolean;
  badgeLabel?: string;
  onBadgeCommit?: (value: string) => void;
  emptyLabel?: string;
  onEmptyCommit?: (value: string) => void;
}) {
  const chrome = useEditorChrome();
  const slides = images.filter((image): image is { url: string; alt: string } => Boolean(image.url));
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const safe = slides.length > 0 ? Math.min(index, slides.length - 1) : 0;
  const current = slides[safe];
  function write(next: Array<{ url?: string; alt: string }>) {
    onCommit?.(next.slice(0, GALLERY_IMAGE_MAX));
  }
  return (
    <div>
      {current ? (
        <div className="relative">
          {onCommit ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url} alt={current.alt} className="max-h-[32rem] w-full rounded-[16px] border border-border bg-white object-contain" />
          ) : (
            <button type="button" className="block w-full" onClick={() => setViewer(safe)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.url} alt={current.alt} className="max-h-[32rem] w-full rounded-[16px] border border-border bg-white object-contain" />
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
            <span className={`absolute right-3 rounded-[8px] bg-white px-2 py-1 text-xs font-semibold text-text-primary ${captionOnImage ? "top-3" : "bottom-3"}`}>{safe + 1} / {slides.length}</span>
          ) : null}
          {captionOnImage && current && (onCommit || current.alt.trim()) ? (
            <p className="absolute inset-x-0 bottom-0 rounded-b-[16px] bg-text-primary/70 px-4 py-3 text-sm text-white">
              <InlineText
                value={current.alt}
                placeholder={chromeText(chrome, "phPhotoCaption", "사진 설명")}
                onCommit={
                  onCommit
                    ? (value) => write(slides.map((row, rowIndex) => (rowIndex === safe ? { ...row, alt: value } : row)))
                    : undefined
                }
              />
            </p>
          ) : null}
        </div>
      ) : onCommit ? (
        <div className="flex h-64 items-center justify-center rounded-[16px] border border-border bg-white px-4 text-center text-sm text-text-muted">
          {onEmptyCommit ? (
            <InlineText value={emptyLabel} placeholder={chromeText(chrome, "phImageEmpty", "이미지")} onCommit={onEmptyCommit} />
          ) : (
            emptyLabel.trim() || chromeText(chrome, "phImageEmpty", "이미지")
          )}
        </div>
      ) : null}
      {current && !captionOnImage && (onCommit || current.alt) ? (
        <p className="mt-3 text-sm text-text-body">
          <InlineText
            value={current.alt}
            placeholder={chromeText(chrome, "phImageAlt", "이미지 설명")}
            onCommit={
              onCommit
                ? (value) => write(slides.map((row, rowIndex) => (rowIndex === safe ? { ...row, alt: value } : row)))
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
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <button
            type="button"
            className="text-text-body disabled:text-text-muted"
            disabled={safe === 0 || !current}
            onClick={() => {
              if (!current) return;
              const next = [...slides];
              const [item] = next.splice(safe, 1);
              if (!item) return;
              next.splice(safe - 1, 0, item);
              write(next);
              setIndex(safe - 1);
            }}
          >
            {chromeText(chrome, "editForward", "앞으로")}
          </button>
          <button
            type="button"
            className="text-text-body disabled:text-text-muted"
            disabled={!current || safe >= slides.length - 1}
            onClick={() => {
              if (!current) return;
              const next = [...slides];
              const [item] = next.splice(safe, 1);
              if (!item) return;
              next.splice(safe + 1, 0, item);
              write(next);
              setIndex(safe + 1);
            }}
          >
            {chromeText(chrome, "editBack", "뒤로")}
          </button>
          {current ? (
            <button
              type="button"
              className="text-text-muted"
              onClick={() => {
                write(slides.filter((_, rowIndex) => rowIndex !== safe));
                setIndex(Math.max(0, safe - 1));
              }}
            >
              {chromeText(chrome, "editRemove", "삭제")}
            </button>
          ) : null}
          {current && upload ? (
            <label className="cursor-pointer font-medium text-primary">
              {chromeText(chrome, "mediaReplace", "이 사진 바꾸기")}
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
              {chromeText(chrome, "mediaAddMany", "이미지 여러 장 추가")}
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
                    const added: Array<{ url: string; alt: string }> = [];
                    for (const file of files) {
                      if (slides.length + added.length >= GALLERY_IMAGE_MAX) break;
                      try {
                        const url = await upload(file);
                        if (url) added.push({ url, alt: "" });
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
  const images = (section.content.images as Array<{ url?: string; alt: string }>) ?? [];
  return (
    <div className="bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <SectionEyebrow section={section} />
        <h2 className="mt-2 text-3xl font-bold break-keep">
          <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
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

function Floorplan({ section, narrow }: { section: PageSection; narrow: boolean }) {
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();
  const types =
    (section.content.types as Array<{
      name: string;
      summary: string;
      imageUrl?: string;
      images?: FloorplanImage[];
      activeImageIndex?: number;
      specs?: Array<{ label: string; value: string }>;
      exclusiveArea?: string;
      supplyArea?: string;
      rooms?: string;
    }>) ?? [];
  const storedIndex = Math.min(Math.max(Number(section.content.activeTypeIndex ?? 0) || 0, 0), Math.max(0, types.length - 1));
  const [viewIndex, setViewIndex] = useState(storedIndex);
  const [plan, setPlan] = useState<number | null>(null);
  const [localImage, setLocalImage] = useState(0);
  useEffect(() => {
    setViewIndex(storedIndex);
  }, [storedIndex]);
  const activeIndex = edit ? storedIndex : viewIndex;
  const type = types[activeIndex];
  const images = type ? floorplanImages(type, chrome) : [];
  const storedImage = images.length > 0 ? Math.min(type?.activeImageIndex ?? 0, images.length - 1) : 0;
  useEffect(() => {
    setLocalImage(storedImage);
  }, [storedImage, activeIndex]);
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
    <div className="mx-auto max-w-6xl px-4 py-20">
      <SectionEyebrow section={section} />
      <h2 className="mt-2 text-3xl font-bold break-keep">
        <InlineText value={String(section.content.heading ?? section.title)} onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phTitle", "제목")} />
      </h2>
      {(edit || String(section.content.body ?? "").trim()) ? (
      <p className="mt-4 max-w-3xl text-text-body">
        <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
      </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-2">
        {types.map((item, index) => (
          <div key={`${section.id}-tab-${index}`} className="flex items-center gap-1">
            <button
              type="button"
              className={cn(
                "inline-flex h-12 items-center rounded-[14px] px-4 text-sm font-semibold",
                index === activeIndex ? "bg-primary text-white" : "border border-border bg-white text-text-primary",
              )}
              onClick={() => selectType(index)}
            >
              {item.name || chromeText(chrome, "phTypeFallback", "타입 {n}").replace("{n}", String(index + 1))}
            </button>
            {edit && types.length > 1 ? (
              <>
                <button type="button" className="px-1 text-xs text-text-muted disabled:opacity-40" disabled={index === 0} onClick={() => {
                  const next = [...types];
                  const [row] = next.splice(index, 1);
                  if (!row) return;
                  next.splice(index - 1, 0, row);
                  const nextActive = activeIndex === index ? index - 1 : activeIndex === index - 1 ? index : activeIndex;
                  setTypes(next, nextActive);
                }}>{chromeText(chrome, "editBefore", "앞")}</button>
                <button type="button" className="px-1 text-xs text-text-muted disabled:opacity-40" disabled={index === types.length - 1} onClick={() => {
                  const next = [...types];
                  const [row] = next.splice(index, 1);
                  if (!row) return;
                  next.splice(index + 1, 0, row);
                  const nextActive = activeIndex === index ? index + 1 : activeIndex === index + 1 ? index : activeIndex;
                  setTypes(next, nextActive);
                }}>{chromeText(chrome, "editAfter", "뒤")}</button>
                <button type="button" className="px-1 text-xs text-text-muted" onClick={() => setTypes(types.filter((_, itemIndex) => itemIndex !== index), index === activeIndex ? 0 : activeIndex > index ? activeIndex - 1 : activeIndex)}>
                  {chromeText(chrome, "editRemove", "삭제")}
                </button>
              </>
            ) : null}
          </div>
        ))}
        {edit && types.length < 12 ? (
          <button
            type="button"
            className="inline-flex h-12 items-center rounded-[14px] border border-border px-4 text-sm font-semibold text-primary"
            onClick={() => setTypes([...types, { name: chromeText(chrome, "seedTypeName", "타입"), summary: chromeText(chrome, "seedTypeSummary", "설명을 입력하세요.") }], types.length)}
          >
            {chromeText(chrome, "editAddType", "타입 추가")}
          </button>
        ) : null}
      </div>
      {type ? (
        <div className={cn("mt-6 grid gap-6", !narrow && "lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)]")}>
          <div>
            {images[imageIndex] ? (
              <>
              <div className="relative">
              {edit ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[imageIndex].url} alt={images[imageIndex].alt || type.name} className="max-h-[28rem] w-full rounded-[16px] border border-border bg-surface object-contain" />
              ) : (
                <button type="button" className="block w-full" onClick={() => setPlan(imageIndex)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[imageIndex].url} alt={images[imageIndex].alt || type.name} className="max-h-[28rem] w-full rounded-[16px] border border-border bg-surface object-contain" />
                </button>
              )}
              {images.length > 1 ? <span className="absolute bottom-3 right-3 rounded-[8px] bg-white px-2 py-1 text-xs font-semibold text-text-primary">{imageIndex + 1} / {images.length}</span> : null}
              </div>
              {(edit || images[imageIndex].alt.trim()) ? (
                <p className="mt-2 text-sm text-text-body">
                  <InlineText
                    value={images[imageIndex].alt}
                    placeholder={chromeText(chrome, "phImageAlt", "이미지 설명")}
                    onCommit={edit ? (value) => setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, images.map((image, index) => (index === imageIndex ? { ...image, alt: value } : image)), imageIndex) : row))) : undefined}
                  />
                </p>
              ) : null}
              </>
            ) : edit ? (
              <div className="flex h-64 items-center justify-center rounded-[16px] border border-border bg-surface px-4 text-center text-sm text-text-muted">
                <InlineText value={String(section.content.emptyImageLabel ?? "")} placeholder={chromeText(chrome, "phPlanEmpty", "평면 이미지")} onCommit={textCommit(section, "emptyImageLabel", edit)} />
              </div>
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
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
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
                            if (url) added.push({ url, alt: "" });
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
                {images.length > 1 ? (
                  <>
                    <button type="button" className="text-text-body disabled:text-text-muted" disabled={imageIndex === 0} onClick={() => {
                      const nextImages = [...images];
                      const [item] = nextImages.splice(imageIndex, 1);
                      if (!item) return;
                      nextImages.splice(imageIndex - 1, 0, item);
                      setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, nextImages, imageIndex - 1) : row)));
                    }}>{chromeText(chrome, "editForward", "앞으로")}</button>
                    <button type="button" className="text-text-body disabled:text-text-muted" disabled={imageIndex >= images.length - 1} onClick={() => {
                      const nextImages = [...images];
                      const [item] = nextImages.splice(imageIndex, 1);
                      if (!item) return;
                      nextImages.splice(imageIndex + 1, 0, item);
                      setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, nextImages, imageIndex + 1) : row)));
                    }}>{chromeText(chrome, "editBack", "뒤로")}</button>
                  </>
                ) : null}
                {images.length > 0 ? (
                  <button
                    type="button"
                    className="text-text-muted"
                    onClick={() => {
                      const nextImages = images.filter((_, index) => index !== imageIndex);
                      setTypes(types.map((row, itemIndex) => (itemIndex === activeIndex ? withFloorplanImages(row, nextImages, Math.max(0, imageIndex - 1)) : row)));
                    }}
                  >
                    {chromeText(chrome, "mediaCurrentDelete", "보고 있는 사진 삭제")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="rounded-[16px] border border-border p-6">
            <h3 className="text-xl font-semibold">
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
                      <button
                        type="button"
                        className="shrink-0 text-xs text-text-muted"
                        onClick={() =>
                          setTypes(
                            types.map((row, itemIndex) =>
                              itemIndex === activeIndex ? withFloorplanSpecs(row, floorplanSpecs(row, chrome).filter((_, i) => i !== specIndex), chrome) : row,
                            ),
                          )
                        }
                      >
                        {chromeText(chrome, "editRemove", "삭제")}
                      </button>
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

function Directions({ section, sitePhone, narrow, snapshot }: { section: PageSection; sitePhone: string; narrow: boolean; snapshot: PageSnapshot }) {
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
  const routes = (section.content.routes as Array<{ label: string; detail: string }>) ?? [];
  const [mapOpen, setMapOpen] = useState(false);
  const mapPicture = mapImageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mapImageUrl} alt={String(section.content.mapAlt ?? "").trim() || chromeText(chrome, "phMapAlt", "약도")} className="h-72 w-full object-cover" />
  ) : (
    <div className="flex h-72 items-center justify-center bg-surface px-4 text-center text-sm text-text-muted">
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
    edit?.patch(section.id, { ...section.content, routes: next });
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
        <h2 className="mt-2 text-3xl font-bold break-keep">
          {(edit || placeName.trim()) ? (
            <InlineText value={placeName} placeholder={chromeText(chrome, "phPlace", "장소")} onCommit={textCommit(section, "placeName", edit)} />
          ) : null}
          <span>
            {edit || placeName.trim() ? (
              <>
                {" "}
                {edit ? (
                  <InlineText value={String(section.content.headingSuffix ?? "")} placeholder={chromeText(chrome, "phDirections", "오시는 길")} onCommit={textCommit(section, "headingSuffix", edit)} />
                ) : (
                  String(section.content.headingSuffix ?? "").trim() || chromeText(chrome, "phDirections", "오시는 길")
                )}
              </>
            ) : (
              String(section.content.heading ?? section.title)
            )}
          </span>
        </h2>
        {(edit || String(section.content.body ?? "").trim()) ? (
          <p className="mt-4 max-w-3xl text-text-body">
            <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phBody", "설명")} />
          </p>
        ) : null}
        <div className={cn("mt-8 grid gap-6", !narrow && (edit || mapImageUrl) && "lg:grid-cols-2")}>
          <div>
            {(edit || address.trim() || phone.trim() || String(section.content.hours ?? "").trim() || String(section.content.parking ?? "").trim()) ? (
            <dl className="overflow-hidden rounded-[16px] border border-border bg-white">
              {(edit || address.trim()) ? (
                <div className="grid grid-cols-[auto_1fr] border-b border-border last:border-b-0">
                  <dt className="bg-surface px-4 py-3 text-sm text-text-muted">{rowName("addressLabel", "phRowAddress", "주소")}</dt>
                  <dd className="px-4 py-3 font-medium">
                    <InlineText value={address} onCommit={textCommit(section, "address", edit)} placeholder={chromeText(chrome, "phAddress", "주소")} />
                  </dd>
                </div>
              ) : null}
              {(edit || phone.trim()) ? (
                <div className="grid grid-cols-[auto_1fr] border-b border-border last:border-b-0">
                  <dt className="bg-surface px-4 py-3 text-sm text-text-muted">{rowName("phoneRowLabel", "phRowPhone", "전화")}</dt>
                  <dd className="px-4 py-3 font-medium">
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
                <div className="grid grid-cols-[auto_1fr] border-b border-border last:border-b-0">
                  <dt className="bg-surface px-4 py-3 text-sm text-text-muted">{rowName("hoursLabel", "phRowHours", "운영")}</dt>
                  <dd className="px-4 py-3 font-medium">
                    <InlineText value={String(section.content.hours ?? "")} onCommit={textCommit(section, "hours", edit)} placeholder={chromeText(chrome, "phHours", "운영 시간")} />
                  </dd>
                </div>
              ) : null}
              {(edit || String(section.content.parking ?? "").trim()) ? (
                <div className="grid grid-cols-[auto_1fr] border-b border-border last:border-b-0">
                  <dt className="bg-surface px-4 py-3 text-sm text-text-muted">{rowName("parkingLabel", "phRowParking", "주차")}</dt>
                  <dd className="px-4 py-3 font-medium">
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
                  <div key={`${section.id}-route-${index}`}>
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
                      <div className="mt-1 flex gap-3 text-xs text-text-muted">
                        <button type="button" disabled={index === 0} onClick={() => {
                          const next = [...routes];
                          const [row] = next.splice(index, 1);
                          if (!row) return;
                          next.splice(index - 1, 0, row);
                          setRoutes(next);
                        }}>{chromeText(chrome, "editUp", "위로")}</button>
                        <button type="button" disabled={index === routes.length - 1} onClick={() => {
                          const next = [...routes];
                          const [row] = next.splice(index, 1);
                          if (!row) return;
                          next.splice(index + 1, 0, row);
                          setRoutes(next);
                        }}>{chromeText(chrome, "editDown", "아래로")}</button>
                        <button type="button" onClick={() => setRoutes(routes.filter((_, rowIndex) => rowIndex !== index))}>{chromeText(chrome, "editRemove", "삭제")}</button>
                      </div>
                    ) : null}
                  </div>
                ) : null)}
                {edit ? (
                  <button type="button" className="text-sm font-medium text-primary" onClick={() => setRoutes([...routes, { label: chromeText(chrome, "seedRouteLabel", "교통"), detail: chromeText(chrome, "seedRouteDetail", "안내를 입력하세요.") }])}>
                    {chromeText(chrome, "editAddRoute", "교통 추가")}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {edit || mapImageUrl ? (
          <div>
            {edit ? (
              <p className="mb-3 text-sm text-text-muted">{chromeText(chrome, "hintMapEmbed", "지도는 페이지 안에 삽입되지 않습니다. 약도를 올리고 링크를 넣으면, 방문자가 약도를 눌러 지도로 이동합니다.")}</p>
            ) : null}
            <div className="relative overflow-hidden rounded-[16px] border border-border bg-white">
              {mapImageUrl && mapUrl && !edit ? (
                <a href={mapUrl} target="_blank" rel="noreferrer" className="block">
                  {mapPicture}
                  <span className="absolute bottom-3 right-3 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-primary">
                    {String(section.content.mapLinkLabel ?? "").trim() || chromeText(chrome, "phMapLink", "지도에서 보기")}
                  </span>
                </a>
              ) : mapImageUrl ? (
                <button type="button" className="block w-full" onClick={() => setMapOpen(true)}>
                  {mapPicture}
                </button>
              ) : (
                mapPicture
              )}
              {edit && mapImageUrl ? (
                <span className="absolute bottom-3 right-3 rounded-[8px] bg-white px-3 py-2 text-sm font-semibold text-primary">
                  <InlineText value={String(section.content.mapLinkLabel ?? "")} placeholder={chromeText(chrome, "phMapLink", "지도에서 보기")} onCommit={textCommit(section, "mapLinkLabel", edit)} />
                </span>
              ) : null}
            </div>
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
            {edit ? (
              <label className="mt-3 inline-block cursor-pointer text-sm font-medium text-primary">
                {chromeText(chrome, "mediaMapFile", "약도 이미지")}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    void edit.upload(file).then((url) => edit.patch(section.id, { ...section.content, mapImageUrl: url })).catch(() => undefined);
                  }}
                />
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

function Legal({ section, snapshot, live }: { section: PageSection; snapshot: PageSnapshot; live: boolean }) {
  const chrome = useEditorChrome();
  const edit = useCanvasEdit();
  const [copied, setCopied] = useState<"ok" | "fail" | "">("");
  const notices = (section.content.notices as Array<{ text: string }>) ?? [];
  const contact = String(section.content.contact ?? "");
  const inquiry = contact.trim() || snapshot.phone;
  function prefix(key: string, chromeKey: string, fallback: string) {
    const value = String(section.content[key] ?? "");
    const shown = chromeText(chrome, chromeKey, fallback);
    if (!edit) return `${value.trim() || shown}: `;
    return (
      <>
        <InlineText value={value} placeholder={shown} onCommit={textCommit(section, key, edit)} />
        {": "}
      </>
    );
  }
  function setNotices(next: Array<{ text: string }>) {
    edit?.patch(section.id, { ...section.content, notices: next });
  }
  async function copyPage() {
    const url = live ? window.location.href : `${window.location.origin}/${snapshot.publicSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    window.setTimeout(() => setCopied(""), 1500);
  }
  return (
    <footer className="border-t border-border bg-white px-4 py-12 text-sm text-text-muted">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <p className="text-lg font-semibold text-text-primary">{snapshot.projectName}</p>
            {edit || String(snapshot.globalSettings.navSubtitle ?? "").trim() ? (
              <p className="mt-1">
                <InlineText
                  value={String(snapshot.globalSettings.navSubtitle ?? "")}
                  placeholder={chromeText(chrome, "phNavSubtitle", "상단 보조 문구")}
                  onCommit={edit?.setNavSubtitle}
                />
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs">
              {edit ? (
                <InlineText value={String(section.content.sitePhoneLabel ?? "")} placeholder={chromeText(chrome, "phPhoneCaption", "문의번호")} onCommit={textCommit(section, "sitePhoneLabel", edit)} />
              ) : (
                String(section.content.sitePhoneLabel ?? "").trim() || chromeText(chrome, "phPhoneCaption", "문의번호")
              )}
            </p>
            {!edit && phoneHref(snapshot.phone) ? (
              <a href={phoneHref(snapshot.phone)} className="text-lg font-semibold text-text-primary">{snapshot.phone}</a>
            ) : (
              <p className="text-lg font-semibold text-text-primary">
                <InlineText value={snapshot.phone} placeholder={chromeText(chrome, "phPhoneMain", "대표 전화")} onCommit={edit?.setPhone} />
              </p>
            )}
          </div>
        </div>
        <div className="space-y-3">
        <p className="font-medium text-text-body">
          <InlineText value={String(section.content.heading ?? chromeText(chrome, "seedLegalHeading", "사업 주체 및 법적 고지"))} onCommit={textCommit(section, "heading", edit)} placeholder={chromeText(chrome, "phLegalTitle", "고지 제목")} />
        </p>
        {(edit || String(section.content.body ?? "").trim()) ? (
          <p>
            <BoldCopy value={String(section.content.body ?? "")} multiline onCommit={textCommit(section, "body", edit)} placeholder={chromeText(chrome, "phLegalBody", "고지 문구")} />
          </p>
        ) : null}
        {(edit || String(section.content.developerName ?? "").trim()) ? (
          <p>
            {prefix("developerLabel", "phPrefixDeveloper", "시행")}
            <InlineText value={String(section.content.developerName ?? "")} onCommit={textCommit(section, "developerName", edit)} placeholder={chromeText(chrome, "phDeveloper", "시행사")} />
          </p>
        ) : null}
        {(edit || String(section.content.builderName ?? "").trim()) ? (
          <p>
            {prefix("builderLabel", "phPrefixBuilder", "시공")}
            <InlineText value={String(section.content.builderName ?? "")} onCommit={textCommit(section, "builderName", edit)} placeholder={chromeText(chrome, "phBuilder", "시공사")} />
          </p>
        ) : null}
        {(edit || String(section.content.advertiserName || snapshot.privacy.advertiserCompanyName).trim()) ? (
          <p>
            {prefix("advertiserLabel", "phPrefixAdvertiser", "광고주")}
            <InlineText value={String(section.content.advertiserName || snapshot.privacy.advertiserCompanyName)} onCommit={textCommit(section, "advertiserName", edit)} placeholder={chromeText(chrome, "phAdvertiser", "광고주")} />
          </p>
        ) : null}
        {(edit || String(section.content.agencyName || snapshot.privacy.advertisingAgencyName).trim()) ? (
          <p>
            {prefix("agencyLabel", "phPrefixAgency", "광고사")}
            <InlineText value={String(section.content.agencyName || snapshot.privacy.advertisingAgencyName)} onCommit={textCommit(section, "agencyName", edit)} placeholder={chromeText(chrome, "phAgency", "광고사")} />
          </p>
        ) : null}
        {(edit || inquiry.trim()) ? (
          <p>
            {prefix("contactLabel", "phPrefixContact", "문의")}
            {edit ? (
              <InlineText
                value={contact}
                placeholder={chromeText(chrome, "formPhoneEmptyPh", "비우면 대표 전화")}
                onCommit={(value) => edit.patch(section.id, { ...section.content, contact: value })}
              />
            ) : live && phoneHref(inquiry) ? (
              <a href={phoneHref(inquiry)} className="font-semibold text-text-primary">{inquiry}</a>
            ) : (
              inquiry
            )}
          </p>
        ) : null}
        {notices.length > 0 || edit ? (
          <ul className="space-y-2">
            {notices.filter((notice) => edit || notice.text.trim()).map((notice, index) => (
              <li key={`${section.id}-notice-${index}`}>
                <InlineText
                  value={notice.text}
                  multiline
                  placeholder={chromeText(chrome, "phLegalNotice", "고지 문장")}
                  onCommit={edit ? (value) => setNotices(notices.map((row, rowIndex) => (rowIndex === index ? { ...row, text: value } : row))) : undefined}
                />
                {edit ? (
                  <div className="mt-1 flex gap-3 text-xs">
                    <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === 0} onClick={() => {
                      const next = [...notices];
                      const [row] = next.splice(index, 1);
                      if (!row) return;
                      next.splice(index - 1, 0, row);
                      setNotices(next);
                    }}>{chromeText(chrome, "editUp", "위로")}</button>
                    <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === notices.length - 1} onClick={() => {
                      const next = [...notices];
                      const [row] = next.splice(index, 1);
                      if (!row) return;
                      next.splice(index + 1, 0, row);
                      setNotices(next);
                    }}>{chromeText(chrome, "editDown", "아래로")}</button>
                    <button type="button" className="text-text-muted" onClick={() => setNotices(notices.filter((_, rowIndex) => rowIndex !== index))}>
                      {chromeText(chrome, "editRemove", "삭제")}
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
            {edit ? (
              <li>
                <button type="button" className="text-sm font-medium text-primary" onClick={() => setNotices([...notices, { text: chromeText(chrome, "seedLegalNotice", "고지 문장을 입력하세요.") }])}>
                  {chromeText(chrome, "editAddNotice", "고지 추가")}
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
        {policyHref(snapshot.privacy.privacyPolicyUrl) ? (
          <a href={policyHref(snapshot.privacy.privacyPolicyUrl)} className="inline-flex font-semibold text-primary">
            {String(snapshot.privacy.privacyPolicyLabel ?? "").trim() || chromeText(chrome, "phPrivacyPolicy", "개인정보 처리방침")}
          </a>
        ) : null}
        {(edit || String(section.content.footerNote ?? "").trim()) ? (
          <p>
            <BoldCopy value={String(section.content.footerNote ?? "")} multiline onCommit={textCommit(section, "footerNote", edit)} placeholder={chromeText(chrome, "phFooterNote", "페이지 하단 안내")} />
          </p>
        ) : null}
        <button
          type="button"
          className="inline-flex h-12 items-center rounded-[14px] border border-border bg-white px-5 text-sm font-semibold text-text-primary"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
            void copyPage();
          }}
        >
          {copied === "ok" ? copyFlash(snapshot.globalSettings, "ok") : copied === "fail" ? copyFlash(snapshot.globalSettings, "fail") : edit ? (
            <InlineText value={String(section.content.copyPageLabel ?? "")} placeholder={chromeText(chrome, "phCopyPage", "페이지 주소 복사")} onCommit={textCommit(section, "copyPageLabel", edit)} />
          ) : (
            String(section.content.copyPageLabel ?? "").trim() || chromeText(chrome, "phCopyPage", "페이지 주소 복사")
          )}
        </button>
        </div>
      </div>
    </footer>
  );
}
