"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import type { PageSection } from "@/types";
import { isKoreanMobile } from "@/lib/validation/phone";
import { isDefaultSampleLogo, SAMPLE_LOGO_URL } from "@/modules/templates/definitions";
import { catchUpOakSiteName, linkOakSiteName, patchOakFromSection, settleOakSpaceItems } from "../oak-data";
import { oakDefaultLocationMapSvg, oakPlanSvg } from "../lib/plan-svg";
import type {
  OakEditorialData,
  OakFaqItem,
  OakGalleryItem,
  OakHeroPhoto,
  OakLocationRow,
  OakPlanType,
  OakSpecRow,
  OakStat,
} from "../types";
import { OakImage, OakText } from "./OakEditable";
import "../styles/oak-editorial.css";

type Props = {
  data: OakEditorialData;
  sections: PageSection[];
  editMode: boolean;
  leadLive?: boolean;
  previewDevice?: "desktop" | "tablet" | "mobile";
  publicSlug?: string | null;
  projectId?: string | null;
  thirdPartyRequired?: boolean;
  onChange?: (data: OakEditorialData | ((prev: OakEditorialData) => OakEditorialData)) => void;
  onSectionContentChange?: (sectionId: string, content: Record<string, unknown>) => void;
};

type LightboxState =
  | { open: false }
  | { open: true; mode: "gallery"; index: number }
  | { open: true; mode: "plan"; planId: string; planName: string; floorplanImageUrl: string };

const OAK_PLAN_MAX = 12;
const OAK_SPACE_MAX = 4;

function oakRegisterCtaLabel(value: string) {
  const text = value.replace(/\s+/g, " ").trim();
  if (!text || text === "타입으로 관심 등록" || text === "관심 등록" || text === "관심등록") {
    return "관심고객 등록";
  }
  return text;
}

const DEFAULT_ANCHORS = {
  overview: "overview",
  spaces: "spaces",
  plans: "plans",
  location: "location",
  register: "register",
} as const;

function formatPhoneBlur(value: string) {
  const n = value.replace(/\D/g, "").slice(0, 11);
  if (n.length > 7) return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
  if (n.length > 3) return `${n.slice(0, 3)}-${n.slice(3)}`;
  return n;
}

function tabDomId(sectionId: string, planId: string) {
  return `tab-${sectionId}-${planId.replace(/\W/g, "")}`;
}

function mergedDataForSection(data: OakEditorialData, section: PageSection): OakEditorialData {
  if (section.isOriginal) return data;
  return patchOakFromSection(data, section);
}

export function OakLandingView({
  data,
  sections,
  editMode,
  leadLive = false,
  previewDevice = "desktop",
  publicSlug = null,
  thirdPartyRequired = false,
  onChange,
  onSectionContentChange,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lightboxContentRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const typeSelectRef = useRef<HTMLSelectElement>(null);
  const formResultRef = useRef<HTMLDivElement>(null);

  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userReducedMotion, setUserReducedMotion] = useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);
  const [floatingHidden, setFloatingHidden] = useState(true);
  const [progressScale, setProgressScale] = useState(0);
  const [heroZoom, setHeroZoom] = useState(1);
  const [heroStickyPadding, setHeroStickyPadding] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState>({ open: false });
  const [activePlanBySection, setActivePlanBySection] = useState<Record<string, string>>({});
  const [formResult, setFormResult] = useState<{
    visible: boolean;
    kind: "preview" | "success" | "error";
    title: string;
    detail: string;
  }>({ visible: false, kind: "preview", title: "", detail: "" });
  const [submitting, setSubmitting] = useState(false);

  const visibleSections = useMemo(
    () => [...sections].filter((s) => s.isVisible).sort((a, b) => a.sortOrder - b.sortOrder),
    [sections],
  );

  const registerAnchor = useMemo(() => {
    const reg = visibleSections.find((s) => s.sectionType === "lead_form");
    return reg?.anchorId || DEFAULT_ANCHORS.register;
  }, [visibleSections]);

  const photos = data.hero.photos;

  /** 프리미엄(스페이스) 갤러리 라이트박스용 — 히어로 사진과 분리 */
  const galleryPhotos = useMemo(
    (): OakHeroPhoto[] =>
      data.spaces.items
        .filter((item) => String(item.imageUrl ?? "").trim())
        .map((item, i) => ({
          src: item.imageUrl,
          alt: item.alt || item.title,
          label: item.eyebrow || item.title || `0${i + 1}`,
        })),
    [data.spaces.items],
  );

  const gnbLinks = useMemo(() => {
    const typeOrder: PageSection["sectionType"][] = [
      "overview",
      "premium",
      "floorplan",
      "location",
      "lead_form",
    ];
    const fromSections = visibleSections
      .filter((s) => s.showInGnb && typeOrder.includes(s.sectionType))
      .map((s) => {
        const label =
          s.gnbLabel.trim() ||
          (s.sectionType === "overview"
            ? data.nav.overview
            : s.sectionType === "premium"
              ? data.nav.spaces
              : s.sectionType === "floorplan"
                ? data.nav.plans
                : s.sectionType === "location"
                  ? data.nav.location
                  : data.nav.register.replace(/\s*↗\s*$/, ""));
        return { href: `#${s.anchorId}`, label };
      });
    if (fromSections.length > 0) return fromSections;
    return [
      { href: `#${DEFAULT_ANCHORS.overview}`, label: data.nav.overview },
      { href: `#${DEFAULT_ANCHORS.spaces}`, label: data.nav.spaces },
      { href: `#${DEFAULT_ANCHORS.plans}`, label: data.nav.plans },
      { href: `#${DEFAULT_ANCHORS.location}`, label: data.nav.location },
    ];
  }, [visibleSections, data.nav]);

  const reduceMotion = userReducedMotion || systemReducedMotion;

  const patchData = useCallback(
    (fn: (prev: OakEditorialData) => OakEditorialData) => {
      if (editMode && onChange) onChange(fn);
    },
    [editMode, onChange],
  );

  const caughtUpSiteName = useRef(false);
  useEffect(() => {
    if (caughtUpSiteName.current || !editMode || !onChange) return;
    const next = catchUpOakSiteName(data);
    if (!next) return;
    caughtUpSiteName.current = true;
    onChange(next);
  }, [data, editMode, onChange]);

  const caughtUpSpaces = useRef(false);
  useEffect(() => {
    if (caughtUpSpaces.current || !editMode || !onChange) return;
    const next = settleOakSpaceItems(data);
    if (next === data) return;
    caughtUpSpaces.current = true;
    onChange((prev) => {
      const settled = settleOakSpaceItems(prev);
      return settled === prev ? prev : settled;
    });
  }, [data, editMode, onChange]);

  const patchSectionFields = useCallback(
    (section: PageSection, fields: Record<string, unknown>) => {
      if (!editMode) return;
      const nextContent = { ...(section.content ?? {}), oak: true, ...fields };
      if (section.isOriginal) {
        onChange?.((prev) => patchOakFromSection(prev, { ...section, content: nextContent }));
      } else {
        onSectionContentChange?.(section.id, nextContent);
      }
    },
    [editMode, onChange, onSectionContentChange],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setSystemReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    setUserReducedMotion(systemReducedMotion);
  }, [systemReducedMotion]);

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.classList.toggle("reduce-motion", reduceMotion);
    root.style.scrollBehavior = reduceMotion ? "auto" : "smooth";
  }, [reduceMotion]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const nodes = [...root.querySelectorAll<HTMLElement>(".reveal")];
    nodes.forEach((el) => el.classList.add("pending"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.remove("pending");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05 },
    );
    nodes.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [visibleSections, data]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scroller =
      (root.closest("[data-preview-scroll]") as HTMLElement | null) ??
      (document.scrollingElement as HTMLElement | null);

    let ticking = false;
    const renderScroll = () => {
      const track = root.querySelector<HTMLElement>(".hero-track");
      const sticky = root.querySelector<HTMLElement>(".hero-sticky");
      const heroPhoto = root.querySelector<HTMLElement>(".hero-photo");
      const registerEl = root.querySelector<HTMLElement>(`#${CSS.escape(registerAnchor)}`);
      const nativeCta = root.querySelector<HTMLElement>(".select-plan-link");
      const scrollTop =
        scroller === document.scrollingElement || !scroller
          ? window.scrollY
          : scroller.scrollTop;
      const viewportHeight =
        scroller === document.scrollingElement || !scroller
          ? window.innerHeight
          : scroller.clientHeight;

      if (track && sticky && heroPhoto) {
        const trackTop =
          scroller && scroller !== document.scrollingElement
            ? track.getBoundingClientRect().top - scroller.getBoundingClientRect().top
            : track.getBoundingClientRect().top;
        const distance = Math.max(1, track.offsetHeight - sticky.offsetHeight);
        const p = Math.max(0, Math.min(1, -trackTop / distance));
        const mobile = root.dataset.device ? root.dataset.device === "mobile" : window.innerWidth <= 700;
        const gutter =
          parseFloat(getComputedStyle(root).getPropertyValue("--gutter")) || 40;
        if (reduceMotion) {
          setHeroStickyPadding(gutter);
          setHeroZoom(1);
        } else {
          setHeroStickyPadding(gutter * (1 - p));
          setHeroZoom(1 + p * (mobile ? 0.06 : 0.12));
        }
      }

      const max =
        scroller && scroller !== document.scrollingElement
          ? scroller.scrollHeight - scroller.clientHeight
          : document.documentElement.scrollHeight - window.innerHeight;
      setProgressScale(max > 0 ? scrollTop / max : 0);

      if (registerEl) {
        const registerRect = registerEl.getBoundingClientRect();
        const scrollerTop =
          scroller && scroller !== document.scrollingElement
            ? scroller.getBoundingClientRect().top
            : 0;
        let hide =
          scrollTop < viewportHeight || registerRect.top - scrollerTop < viewportHeight;
        if (nativeCta) {
          const ctaRect = nativeCta.getBoundingClientRect();
          const top = ctaRect.top - scrollerTop;
          const bottom = ctaRect.bottom - scrollerTop;
          if (top > 0 && bottom < viewportHeight) hide = true;
        }
        setFloatingHidden(hide);
      } else {
        setFloatingHidden(scrollTop < viewportHeight);
      }
      ticking = false;
    };

    const schedule = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(renderScroll);
      }
    };

    schedule();
    const target: HTMLElement | Window =
      scroller && scroller !== document.scrollingElement ? scroller : window;
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [reduceMotion, registerAnchor, visibleSections]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (lightbox.open) {
      if (!dialog.open) {
        lastFocusRef.current = document.activeElement as HTMLElement | null;
        dialog.showModal();
        document.body.style.overflow = "hidden";
        dialog.querySelector<HTMLButtonElement>(".close")?.focus();
      }
    } else if (dialog.open) {
      dialog.close();
      document.body.style.overflow = "";
      lastFocusRef.current?.focus();
    }
  }, [lightbox]);

  useEffect(() => {
    const el = lightboxContentRef.current;
    if (!el || !lightbox.open || lightbox.mode !== "gallery") return;
    let touchStart: { x: number; y: number } | null = null;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (!touchStart) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        setLightbox((prev) => {
          if (!prev.open || prev.mode !== "gallery") return prev;
          const len = galleryPhotos.length || 1;
          const next = (prev.index + (dx < 0 ? 1 : len - 1)) % len;
          return { open: true, mode: "gallery", index: next };
        });
      }
      touchStart = null;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchend", onEnd);
    };
  }, [lightbox, galleryPhotos.length]);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const openGallery = useCallback(
    (index: number) => {
      if (galleryPhotos.length === 0) return;
      setLightbox({
        open: true,
        mode: "gallery",
        index: ((index % galleryPhotos.length) + galleryPhotos.length) % galleryPhotos.length,
      });
    },
    [galleryPhotos.length],
  );

  const openPlanLightbox = useCallback(
    (planId: string, planName: string, floorplanImageUrl: string) => {
      setLightbox({ open: true, mode: "plan", planId, planName, floorplanImageUrl });
    },
    [],
  );

  const setPlanForSection = useCallback((sectionId: string, planId: string) => {
    setActivePlanBySection((prev) => ({ ...prev, [sectionId]: planId }));
  }, []);

  const getActivePlan = useCallback(
    (section: PageSection, plans: OakPlanType[]) => {
      const current = activePlanBySection[section.id];
      if (current && plans.some((p) => p.id === current)) return current;
      return plans[0]?.id ?? "84A";
    },
    [activePlanBySection],
  );

  const onSelectPlanCta = useCallback(
    (planId: string) => {
      if (!typeSelectRef.current) return;
      const plan = data.floorplan.plans.find((item) => item.id === planId);
      typeSelectRef.current.value = plan?.name || planId;
    },
    [data.floorplan.plans],
  );

  const onFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nameInput = form.elements.namedItem("name") as HTMLInputElement;
    const phoneInput = form.elements.namedItem("phone") as HTMLInputElement;
    const typeInput = form.elements.namedItem("type") as HTMLSelectElement;
    const consentInput = form.elements.namedItem("consent") as HTMLInputElement;
    const thirdPartyInput = form.elements.namedItem("thirdParty") as HTMLInputElement | null;

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const selectedType = typeInput.value;

    if (!name) {
      nameInput.setCustomValidity("이름을 입력해주세요.");
      form.reportValidity();
      return;
    }
    nameInput.setCustomValidity("");

    if (!isKoreanMobile(phone)) {
      setFormResult({
        visible: true,
        kind: "error",
        title: "등록에 실패했습니다.",
        detail: "올바른 휴대전화 번호를 입력해 주세요.",
      });
      formResultRef.current?.focus({ preventScroll: true });
      return;
    }

    if (!consentInput.checked) {
      setFormResult({
        visible: true,
        kind: "error",
        title: "등록에 실패했습니다.",
        detail: "개인정보 수집·이용에 동의해 주세요.",
      });
      formResultRef.current?.focus({ preventScroll: true });
      return;
    }

    if (thirdPartyRequired && !thirdPartyInput?.checked) {
      setFormResult({
        visible: true,
        kind: "error",
        title: "등록에 실패했습니다.",
        detail: "개인정보 제3자 제공에 동의해 주세요.",
      });
      formResultRef.current?.focus({ preventScroll: true });
      return;
    }

    const canSubmitLive = leadLive && publicSlug && !editMode;

    if (!canSubmitLive) {
      setFormResult({
        visible: true,
        kind: "preview",
        title: "미리보기 화면입니다.",
        detail: `${selectedType ? `선택 타입: ${selectedType}. ` : ""}입력 정보는 저장·전송되지 않습니다.`,
      });
      form.reset();
      formResultRef.current?.focus({ preventScroll: true });
      return;
    }

    setSubmitting(true);
    setFormResult({ visible: false, kind: "preview", title: "", detail: "" });
    try {
      const payload = {
        name,
        phone,
        website: "",
        answers: selectedType ? { unitType: selectedType } : {},
        consents: {
          collection: true,
          thirdParty: thirdPartyRequired ? Boolean(thirdPartyInput?.checked) : false,
        },
        utm: Object.fromEntries(new URLSearchParams(window.location.search)),
        referrer: document.referrer,
      };
      const res = await fetch(`/api/public/projects/${encodeURIComponent(publicSlug)}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setFormResult({
          visible: true,
          kind: "error",
          title: "등록에 실패했습니다.",
          detail: json.message ?? "잠시 후 다시 시도해 주세요.",
        });
        formResultRef.current?.focus({ preventScroll: true });
        return;
      }
      setFormResult({
        visible: true,
        kind: "success",
        title: "관심고객 등록이 완료되었습니다.",
        detail: selectedType ? `선택 타입: ${selectedType}.` : "",
      });
      form.reset();
      formResultRef.current?.focus({ preventScroll: true });
    } catch {
      setFormResult({
        visible: true,
        kind: "error",
        title: "등록에 실패했습니다.",
        detail: "네트워크 오류가 발생했습니다.",
      });
      formResultRef.current?.focus({ preventScroll: true });
    } finally {
      setSubmitting(false);
    }
  };

  const renderHero = (section: PageSection) => {
    const block = mergedDataForSection(data, section);
    const hero = block.hero;
    const manifesto = block.manifesto;
    const activePhoto = photos[heroPhotoIndex] ?? photos[0];

    return (
      <>
        <section aria-labelledby="hero-title" data-section="hero">
          <div className="hero-intro">
            <div className="hero-top">
              <OakText
                className="eyebrow"
                value={hero.eyebrowLeft}
                editMode={editMode && !!onChange && section.isOriginal}
                onChange={(v) => patchData((d) => ({ ...d, hero: { ...d.hero, eyebrowLeft: v } }))}
                multiline={false}
              />
              <OakText
                className="eyebrow"
                value={hero.eyebrowRight}
                editMode={editMode && !!onChange && section.isOriginal}
                onChange={(v) => patchData((d) => ({ ...d, hero: { ...d.hero, eyebrowRight: v } }))}
                multiline={false}
              />
            </div>
            <div className="hero-heading-row">
              <h1 className="hero-title" id="hero-title">
                <OakText
                  as="span"
                  value={hero.title}
                  editMode={editMode && !!onChange && section.isOriginal}
                  onChange={(v) =>
                    patchData(
                      (d) => linkOakSiteName(d, d.hero.title, v) ?? { ...d, hero: { ...d.hero, title: v } },
                    )
                  }
                  multiline={false}
                />
              </h1>
              <div className="hero-side">
                <OakText
                  className="eyebrow"
                  value={hero.sideEyebrow}
                  editMode={editMode && !!onChange && section.isOriginal}
                  onChange={(v) =>
                    patchData(
                      (d) =>
                        linkOakSiteName(d, d.hero.sideEyebrow, v) ?? { ...d, hero: { ...d.hero, sideEyebrow: v } },
                    )
                  }
                  multiline={false}
                />
                <OakText
                  as="p"
                  value={hero.sideHeadline}
                  editMode={editMode && !!onChange && section.isOriginal}
                  onChange={(v) => patchData((d) => ({ ...d, hero: { ...d.hero, sideHeadline: v } }))}
                />
                <OakText
                  className="eyebrow"
                  value={hero.sideMeta}
                  editMode={editMode && !!onChange && section.isOriginal}
                  onChange={(v) => patchData((d) => ({ ...d, hero: { ...d.hero, sideMeta: v } }))}
                  multiline={false}
                />
              </div>
            </div>
            <div className="hero-bottom">
              <OakText
                as="p"
                value={hero.bottomLead}
                editMode={editMode && !!onChange && section.isOriginal}
                onChange={(v) => patchData((d) => ({ ...d, hero: { ...d.hero, bottomLead: v } }))}
              />
              <a href={`#${DEFAULT_ANCHORS.overview}`} className="eyebrow">
                <OakText
                  value={hero.exploreLabel}
                  editMode={editMode && !!onChange && section.isOriginal}
                  onChange={(v) => patchData((d) => ({ ...d, hero: { ...d.hero, exploreLabel: v } }))}
                  multiline={false}
                />
              </a>
            </div>
          </div>
          <div className="hero-track">
            <div
              className="hero-sticky"
              style={
                heroStickyPadding != null ? { paddingInline: `${heroStickyPadding}px` } : undefined
              }
            >
              <div className="hero-frame">
                {editMode && onChange && section.isOriginal ? (
                  <OakImage
                    url={activePhoto?.src ?? ""}
                    alt={activePhoto?.alt ?? ""}
                    editMode
                    className="hero-photo"
                    onChange={(url) => {
                      const next = [...data.hero.photos];
                      const row = { ...next[heroPhotoIndex], src: url };
                      next[heroPhotoIndex] = row;
                      patchData((d) => ({ ...d, hero: { ...d.hero, photos: next } }));
                    }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="hero-photo"
                    id="hero-photo"
                    src={activePhoto?.src ?? ""}
                    alt={activePhoto?.alt ?? ""}
                    fetchPriority="high"
                    style={{ ["--zoom" as string]: heroZoom }}
                  />
                )}
                <div className="thumbs" aria-label="히어로 사진 선택">
                  {photos.map((photo, i) => (
                    <button
                      key={i}
                      type="button"
                      className="thumb"
                      data-photo={String(i)}
                      aria-label={`사진 ${i + 1}`}
                      aria-pressed={heroPhotoIndex === i}
                      onClick={() => setHeroPhotoIndex(i)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.src} alt="" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="hero-caption eyebrow">
            <span id="hero-caption">{activePhoto?.label ?? ""}</span>
            <span>{data.isSampleData ? hero.captionNote : hero.captionNote}</span>
          </div>
        </section>
        <section className="manifesto">
          <OakText
            className="eyebrow"
            value={manifesto.eyebrow}
            editMode={editMode && !!onChange && section.isOriginal}
            onChange={(v) => patchData((d) => ({ ...d, manifesto: { ...d.manifesto, eyebrow: v } }))}
          />
          <div className="reveal">
            <OakText
              as="h2"
              value={manifesto.title}
              editMode={editMode && !!onChange && section.isOriginal}
              onChange={(v) => patchData((d) => ({ ...d, manifesto: { ...d.manifesto, title: v } }))}
            />
            <OakText
              as="p"
              className="body-copy"
              value={manifesto.body}
              editMode={editMode && !!onChange && section.isOriginal}
              onChange={(v) => patchData((d) => ({ ...d, manifesto: { ...d.manifesto, body: v } }))}
            />
          </div>
        </section>
      </>
    );
  };

  const renderOverview = (section: PageSection) => {
    const block = mergedDataForSection(data, section);
    const o = block.overview;
    const editable = editMode && (section.isOriginal ? !!onChange : !!onSectionContentChange);
    const anchor = section.anchorId || DEFAULT_ANCHORS.overview;

    const updateOverview = (fields: Partial<typeof o>) => {
      if (section.isOriginal) {
        patchData((d) => ({ ...d, overview: { ...d.overview, ...fields } }));
      } else {
        patchSectionFields(section, fields);
      }
    };

    return (
      <section id={anchor} className="section wrap" data-section="overview">
        <div className="section-head reveal">
          <OakText
            className="eyebrow"
            value={o.eyebrow}
            editMode={editable}
            onChange={(v) => updateOverview({ eyebrow: v })}
            multiline={false}
          />
          <OakText as="h2" value={o.title} editMode={editable} onChange={(v) => updateOverview({ title: v })} />
        </div>
        <div className="overview-grid">
          <figure className="reveal">
            <div className="portrait">
              <OakImage
                url={o.imageUrl}
                alt=""
                editMode={editable}
                onChange={(url) => updateOverview({ imageUrl: url })}
              />
            </div>
            <figcaption className="photo-note">
              <OakText
                value={o.imageNote}
                editMode={editable}
                onChange={(v) => updateOverview({ imageNote: v })}
                multiline={false}
              />
            </figcaption>
          </figure>
          <div className="overview-info reveal">
            <OakText
              className="eyebrow"
              value={o.infoEyebrow}
              editMode={editable}
              onChange={(v) => updateOverview({ infoEyebrow: v })}
              multiline={false}
            />
            <OakText
              as="h3"
              value={o.infoTitle}
              editMode={editable}
              onChange={(v) => updateOverview({ infoTitle: v })}
            />
            <OakText
              as="p"
              className="body-copy"
              value={o.infoBody}
              editMode={editable}
              onChange={(v) => updateOverview({ infoBody: v })}
            />
            <div className="stats">
              {o.stats.map((stat: OakStat, i: number) => (
                <div className="stat" key={i}>
                  <OakText
                    as="strong"
                    value={stat.value}
                    editMode={editable}
                    onChange={(v) => {
                      const stats = [...o.stats];
                      stats[i] = { ...stats[i], value: v };
                      updateOverview({ stats });
                    }}
                    multiline={false}
                  />
                  <OakText
                    as="span"
                    value={stat.label}
                    editMode={editable}
                    onChange={(v) => {
                      const stats = [...o.stats];
                      stats[i] = { ...stats[i], label: v };
                      updateOverview({ stats });
                    }}
                    multiline={false}
                  />
                </div>
              ))}
            </div>
            <dl className="spec">
              {o.specs.map((row: OakSpecRow, i: number) => (
                <div key={i}>
                  <OakText
                    as="dt"
                    value={row.label}
                    editMode={editable}
                    onChange={(v) => {
                      const specs = [...o.specs];
                      specs[i] = { ...specs[i], label: v };
                      updateOverview({ specs });
                    }}
                    multiline={false}
                  />
                  <OakText
                    as="dd"
                    value={row.value}
                    editMode={editable}
                    onChange={(v) => {
                      const specs = [...o.specs];
                      specs[i] = { ...specs[i], value: v };
                      updateOverview({ specs });
                    }}
                    multiline={false}
                  />
                </div>
              ))}
            </dl>
            <p className="photo-note">
              <OakText
                value={o.footnote}
                editMode={editable}
                onChange={(v) => updateOverview({ footnote: v })}
                multiline={false}
              />
            </p>
          </div>
        </div>
      </section>
    );
  };

  const renderSpaces = (section: PageSection) => {
    const block = mergedDataForSection(data, section);
    const s = block.spaces;
    const editable = editMode && (section.isOriginal ? !!onChange : !!onSectionContentChange);
    const anchor = section.anchorId || DEFAULT_ANCHORS.spaces;

    const updateSpaces = (fields: Partial<typeof s>) => {
      if (section.isOriginal) {
        patchData((d) => ({ ...d, spaces: { ...d.spaces, ...fields } }));
      } else {
        patchSectionFields(section, fields);
      }
    };

    const items = settleOakSpaceItems({ ...block, spaces: s }).spaces.items.slice(0, OAK_SPACE_MAX);

    const addSpace = () => {
      if (items.length >= OAK_SPACE_MAX) return;
      const n = items.length + 1;
      updateSpaces({
        itemCapSettled: true,
        items: [
          ...items,
          {
            imageUrl: "",
            eyebrow: `0${n}`,
            title: "",
            body: "",
            alt: "",
          },
        ],
      });
    };

    const removeSpace = (index: number) => {
      if (items.length <= 1) return;
      updateSpaces({ itemCapSettled: true, items: items.filter((_, itemIndex) => itemIndex !== index) });
    };

    return (
      <section id={anchor} className="section wrap" data-section="premium">
        <div className="section-head reveal">
          <OakText
            className="eyebrow"
            value={s.eyebrow}
            editMode={editable}
            onChange={(v) => updateSpaces({ eyebrow: v })}
            multiline={false}
          />
          <OakText as="h2" value={s.title} editMode={editable} onChange={(v) => updateSpaces({ title: v })} />
          {editable ? <p className="photo-note">제목과 설명을 눌러 수정할 수 있습니다. 특장점은 4개까지입니다.</p> : null}
        </div>
        <div className="gallery-grid" data-count={String(items.length)}>
          {items.map((item: OakGalleryItem, i: number) => (
            <article className="gallery-item reveal" key={`${item.eyebrow}-${i}`}>
              {editable ? (
                <div className="gallery-photo" data-gallery={String(i)}>
                  <OakImage
                    url={item.imageUrl}
                    alt={item.alt}
                    editMode
                    chrome="hover"
                    onChange={(url) => {
                      const next = [...items];
                      next[i] = { ...next[i], imageUrl: url };
                      updateSpaces({ items: next });
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="gallery-photo"
                  data-gallery={String(i)}
                  aria-label={`${item.title} 크게 보기`}
                  onClick={() => {
                    if (!String(item.imageUrl ?? "").trim()) return;
                    const idx = galleryPhotos.findIndex((photo) => photo.src === item.imageUrl);
                    if (idx < 0) return;
                    openGallery(idx);
                  }}
                >
                  <OakImage url={item.imageUrl} alt={item.alt} editMode={false} onChange={() => undefined} />
                </button>
              )}
              <div className="gallery-copy">
                <div>
                  <OakText
                    className="eyebrow"
                    value={item.eyebrow}
                    editMode={editable}
                    placeholder="번호"
                    onChange={(v) => {
                      const next = [...items];
                      next[i] = { ...next[i], eyebrow: v };
                      updateSpaces({ items: next });
                    }}
                    multiline={false}
                  />
                  <OakText
                    as="h3"
                    value={item.title}
                    editMode={editable}
                    placeholder="제목"
                    onChange={(v) => {
                      const next = [...items];
                      next[i] = { ...next[i], title: v };
                      updateSpaces({ items: next });
                    }}
                    multiline={false}
                  />
                  <OakText
                    as="p"
                    value={item.body}
                    editMode={editable}
                    placeholder="설명"
                    onChange={(v) => {
                      const next = [...items];
                      next[i] = { ...next[i], body: v };
                      updateSpaces({ items: next });
                    }}
                  />
                </div>
                {editable && items.length > 1 ? (
                  <button type="button" className="gallery-remove" aria-label={`${item.title || "특장점"} 삭제`} onClick={() => removeSpace(i)}>
                    삭제
                  </button>
                ) : null}
                <span className="arrow" aria-hidden="true">
                  ↗
                </span>
              </div>
            </article>
          ))}
        </div>
        <div className="gallery-action">
          {editable && items.length < OAK_SPACE_MAX ? (
            <button type="button" className="plan-tab-add gallery-add" onClick={addSpace}>
              특장점 추가
            </button>
          ) : null}
          <button
            type="button"
            className="pill"
            data-gallery="0"
            onClick={() => openGallery(0)}
          >
            <OakText
              value={s.viewAllLabel}
              editMode={editable}
              onChange={(v) => updateSpaces({ viewAllLabel: v })}
              multiline={false}
            />
          </button>
        </div>
      </section>
    );
  };

  const renderFloorplan = (section: PageSection) => {
    const block = mergedDataForSection(data, section);
    const fp = block.floorplan;
    const plans = fp.plans;
    const editable = editMode && (section.isOriginal ? !!onChange : !!onSectionContentChange);
    const anchor = section.anchorId || DEFAULT_ANCHORS.plans;
    const activePlanId = getActivePlan(section, plans);
    const activePlan = plans.find((p) => p.id === activePlanId) ?? plans[0];
    const panelLabelId = tabDomId(section.id, activePlanId);

    const updateFloorplan = (fields: Partial<typeof fp>) => {
      if (section.isOriginal) {
        patchData((d) => ({ ...d, floorplan: { ...d.floorplan, ...fields } }));
      } else {
        patchSectionFields(section, fields);
      }
    };

    const updatePlan = (index: number, fields: Partial<OakPlanType>) => {
      const nextPlans = [...plans];
      nextPlans[index] = { ...nextPlans[index], ...fields };
      updateFloorplan({ plans: nextPlans });
    };

    const onTabKeyDown = (e: KeyboardEvent<HTMLElement>, index: number) => {
      if ((e.target as HTMLElement).isContentEditable) return;
      let j: number | null = null;
      if (e.key === "ArrowRight") j = (index + 1) % plans.length;
      else if (e.key === "ArrowLeft") j = (index + plans.length - 1) % plans.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = plans.length - 1;
      else return;
      e.preventDefault();
      const next = plans[j!];
      setPlanForSection(section.id, next.id);
      rootRef.current?.querySelector<HTMLElement>(`#${tabDomId(section.id, next.id)}`)?.focus();
    };

    const addPlan = () => {
      if (plans.length >= OAK_PLAN_MAX) return;
      const id = `plan-${crypto.randomUUID()}`;
      const next: OakPlanType = {
        id,
        name: `타입${plans.length + 1}`,
        area: "",
        supply: "",
        rooms: "",
        heading: "",
        description: "",
        floorplanImageUrl: "",
      };
      updateFloorplan({ plans: [...plans, next] });
      setPlanForSection(section.id, id);
    };

    const removePlan = (index: number) => {
      if (plans.length <= 1) return;
      const removed = plans[index];
      const next = plans.filter((_, itemIndex) => itemIndex !== index);
      updateFloorplan({ plans: next });
      if (removed?.id === activePlanId) {
        const fallback = next[Math.min(index, next.length - 1)];
        if (fallback) setPlanForSection(section.id, fallback.id);
      }
    };

    return (
      <section id={anchor} className="section wrap" data-section="floorplan">
        <OakText
          className="eyebrow"
          value={fp.eyebrow}
          editMode={editable}
          onChange={(v) => updateFloorplan({ eyebrow: v })}
          multiline={false}
        />
        <div className="plan-intro">
          <OakText
            as="h2"
            className="wide-title reveal"
            value={fp.title}
            editMode={editable}
            onChange={(v) => updateFloorplan({ title: v })}
            multiline={false}
          />
          <OakText
            as="p"
            className="body-copy"
            value={fp.lead}
            editMode={editable}
            onChange={(v) => updateFloorplan({ lead: v })}
          />
        </div>
        <div className="plan-layout">
          <div>
            {editable ? <p className="photo-note plan-tabs-hint">타입 이름을 눌러 수정 · 오른쪽에서 삭제하거나 추가</p> : null}
            <div className="plan-tabs" role="tablist" aria-label="평형 선택">
              {plans.map((plan, i) => {
                const id = tabDomId(section.id, plan.id);
                const selected = plan.id === activePlanId;
                if (editable) {
                  return (
                    <div
                      key={plan.id}
                      className="pill plan-tab"
                      id={id}
                      data-plan={plan.id}
                      role="tab"
                      aria-controls={`plan-panel-${section.id}`}
                      aria-selected={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setPlanForSection(section.id, plan.id)}
                      onKeyDown={(e) => onTabKeyDown(e, i)}
                    >
                      <OakText
                        value={plan.name}
                        editMode
                        multiline={false}
                        onChange={(v) => updatePlan(i, { name: v })}
                      />
                      {plans.length > 1 ? (
                        <button
                          type="button"
                          className="plan-tab-remove"
                          aria-label={`${plan.name || "타입"} 삭제`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removePlan(i);
                          }}
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  );
                }
                return (
                  <button
                    key={plan.id}
                    type="button"
                    className="pill"
                    id={id}
                    data-plan={plan.id}
                    role="tab"
                    aria-controls={`plan-panel-${section.id}`}
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setPlanForSection(section.id, plan.id)}
                    onKeyDown={(e) => onTabKeyDown(e, i)}
                  >
                    {plan.name}
                  </button>
                );
              })}
              {editable && plans.length < OAK_PLAN_MAX ? (
                <button type="button" className="plan-tab-add" onClick={addPlan}>
                  타입 추가
                </button>
              ) : null}
            </div>
            <div id={`plan-panel-${section.id}`} role="tabpanel" aria-labelledby={panelLabelId}>
              <div className="plan-stage" id={`plan-drawing-${section.id}`}>
                {activePlan?.floorplanImageUrl ? (
                  <OakImage
                    url={activePlan.floorplanImageUrl}
                    alt={`${activePlan.name} 개념도`}
                    editMode={editable}
                    className="plan-stage-image"
                    onChange={(url) => {
                      const plans = fp.plans.map((p) =>
                        p.id === activePlan.id ? { ...p, floorplanImageUrl: url } : p,
                      );
                      updateFloorplan({ plans });
                    }}
                  />
                ) : editable ? (
                  <div className="plan-stage-fallback">
                    <div dangerouslySetInnerHTML={{ __html: oakPlanSvg(activePlan?.id ?? "84A") }} />
                    <OakImage
                      url=""
                      alt={`${activePlan?.name ?? activePlanId} 개념도 업로드`}
                      editMode
                      className="plan-stage-upload"
                      onChange={(url) => {
                        const planId = activePlan?.id ?? activePlanId;
                        const plans = fp.plans.map((p) =>
                          p.id === planId ? { ...p, floorplanImageUrl: url } : p,
                        );
                        updateFloorplan({ plans });
                      }}
                    />
                  </div>
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: oakPlanSvg(activePlan?.id ?? "84A") }} />
                )}
              </div>
            </div>
            <div className="plan-bottom">
              <p className="photo-note">
                <OakText
                  value={fp.conceptNote}
                  editMode={editable}
                  onChange={(v) => updateFloorplan({ conceptNote: v })}
                />
              </p>
              <button
                type="button"
                className="pill"
                id={`expand-plan-${section.id}`}
                onClick={() =>
                  openPlanLightbox(
                    activePlan?.id ?? "84A",
                    activePlan?.name ?? activePlanId,
                    activePlan?.floorplanImageUrl ?? "",
                  )
                }
              >
                <OakText
                  value={fp.expandLabel}
                  editMode={editable}
                  onChange={(v) => updateFloorplan({ expandLabel: v })}
                  multiline={false}
                />
              </button>
            </div>
          </div>
          <div className="plan-detail" aria-live="polite">
            <OakText
              className="eyebrow"
              value={fp.detailEyebrow}
              editMode={editable}
              onChange={(v) => updateFloorplan({ detailEyebrow: v })}
              multiline={false}
            />
            <div className="plan-title">
              <span id={`plan-name-${section.id}`}>{activePlan?.name}</span>
              <small>TYPE</small>
            </div>
            <OakText
              as="h3"
              value={activePlan?.heading ?? ""}
              editMode={editable}
              onChange={(v) => {
                const idx = plans.findIndex((p) => p.id === activePlanId);
                if (idx >= 0) updatePlan(idx, { heading: v });
              }}
            />
            <OakText
              as="p"
              className="body-copy"
              value={activePlan?.description ?? ""}
              editMode={editable}
              onChange={(v) => {
                const idx = plans.findIndex((p) => p.id === activePlanId);
                if (idx >= 0) updatePlan(idx, { description: v });
              }}
            />
            <dl className="spec">
              <div>
                <dt>전용면적</dt>
                <dd id={`plan-area-${section.id}`}>
                  <OakText
                    as="span"
                    value={activePlan?.area ?? ""}
                    editMode={editable}
                    onChange={(v) => {
                      const idx = plans.findIndex((p) => p.id === activePlanId);
                      if (idx >= 0) updatePlan(idx, { area: v });
                    }}
                    multiline={false}
                  />
                </dd>
              </div>
              <div>
                <dt>공급면적</dt>
                <dd id={`plan-supply-${section.id}`}>
                  <OakText
                    as="span"
                    value={activePlan?.supply ?? ""}
                    editMode={editable}
                    onChange={(v) => {
                      const idx = plans.findIndex((p) => p.id === activePlanId);
                      if (idx >= 0) updatePlan(idx, { supply: v });
                    }}
                    multiline={false}
                  />
                </dd>
              </div>
              <div>
                <dt>공간구성</dt>
                <dd id={`plan-rooms-${section.id}`}>
                  <OakText
                    as="span"
                    value={activePlan?.rooms ?? ""}
                    editMode={editable}
                    onChange={(v) => {
                      const idx = plans.findIndex((p) => p.id === activePlanId);
                      if (idx >= 0) updatePlan(idx, { rooms: v });
                    }}
                    multiline={false}
                  />
                </dd>
              </div>
            </dl>
            <a
              href={`#${registerAnchor}`}
              className="plan-register-cta select-plan-link"
              id={`select-plan-${section.id}`}
              onClick={(event) => {
                if (editable && (event.target as HTMLElement).closest(".oak-editable")) {
                  event.preventDefault();
                  return;
                }
                onSelectPlanCta(activePlanId);
              }}
            >
              <OakText
                value={oakRegisterCtaLabel(fp.registerLinkLabel)}
                editMode={editable}
                onChange={(v) => updateFloorplan({ registerLinkLabel: v })}
                multiline={false}
              />
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>
    );
  };

  const renderLocation = (section: PageSection) => {
    const block = mergedDataForSection(data, section);
    const loc = block.location;
    const editable = editMode && (section.isOriginal ? !!onChange : !!onSectionContentChange);
    const anchor = section.anchorId || DEFAULT_ANCHORS.location;

    const updateLocation = (fields: Partial<typeof loc>) => {
      if (section.isOriginal) {
        patchData((d) => ({ ...d, location: { ...d.location, ...fields } }));
      } else {
        patchSectionFields(section, fields);
      }
    };

    return (
      <section id={anchor} className="section wrap" data-section="location">
        <div className="section-head reveal">
          <OakText
            className="eyebrow"
            value={loc.eyebrow}
            editMode={editable}
            onChange={(v) => updateLocation({ eyebrow: v })}
            multiline={false}
          />
          <OakText as="h2" value={loc.title} editMode={editable} onChange={(v) => updateLocation({ title: v })} />
        </div>
        <div className="location-layout">
          <div className="reveal">
            <OakText
              as="p"
              className="body-copy"
              value={loc.lead}
              editMode={editable}
              onChange={(v) => updateLocation({ lead: v })}
            />
            <div className="location-list">
              {loc.rows.map((row: OakLocationRow, i: number) => (
                <div className="location-row" key={i}>
                  <OakText
                    as="h3"
                    value={row.title}
                    editMode={editable}
                    onChange={(v) => {
                      const rows = [...loc.rows];
                      rows[i] = { ...rows[i], title: v };
                      updateLocation({ rows });
                    }}
                    multiline={false}
                  />
                  <OakText
                    as="p"
                    value={row.body}
                    editMode={editable}
                    onChange={(v) => {
                      const rows = [...loc.rows];
                      rows[i] = { ...rows[i], body: v };
                      updateLocation({ rows });
                    }}
                    multiline={false}
                  />
                </div>
              ))}
            </div>
            <p className="photo-note">
              <OakText
                value={loc.footnote}
                editMode={editable}
                onChange={(v) => updateLocation({ footnote: v })}
                multiline={false}
              />
            </p>
          </div>
          <figure className="location-map reveal">
            {loc.mapImageUrl ? (
              editable ? (
                <OakImage
                  url={loc.mapImageUrl}
                  alt="입지·약도"
                  editMode={editable}
                  onChange={(url) => updateLocation({ mapImageUrl: url })}
                />
              ) : loc.mapLinkUrl?.trim() ? (
                <a
                  href={loc.mapLinkUrl.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="location-map-link"
                  aria-label="지도에서 보기"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={loc.mapImageUrl} alt="입지·약도" />
                  <span className="photo-note">지도에서 보기 ↗</span>
                </a>
              ) : (
                <OakImage
                  url={loc.mapImageUrl}
                  alt="입지·약도"
                  editMode={false}
                  onChange={() => undefined}
                />
              )
            ) : editable ? (
              <div className="location-map-fallback">
                <div dangerouslySetInnerHTML={{ __html: oakDefaultLocationMapSvg() }} />
                <OakImage
                  url=""
                  alt="입지·약도 업로드"
                  editMode
                  className="location-map-upload"
                  onChange={(url) => updateLocation({ mapImageUrl: url })}
                />
              </div>
            ) : loc.mapLinkUrl?.trim() ? (
              <a
                href={loc.mapLinkUrl.trim()}
                target="_blank"
                rel="noreferrer"
                className="location-map-link"
                aria-label="지도에서 보기"
              >
                <div dangerouslySetInnerHTML={{ __html: oakDefaultLocationMapSvg() }} />
                <span className="photo-note">지도에서 보기 ↗</span>
              </a>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: oakDefaultLocationMapSvg() }} />
            )}
            {editable ? (
              <label className="photo-note oak-map-link-field">
                지도 링크 (선택 · 클릭 시 새 탭)
                <input
                  type="url"
                  placeholder="https://naver.me/… · map.naver.com …"
                  value={loc.mapLinkUrl ?? ""}
                  onChange={(e) => updateLocation({ mapLinkUrl: e.target.value })}
                />
              </label>
            ) : null}
            <figcaption className="photo-note">
              <OakText
                value={loc.mapCaption}
                editMode={editable}
                onChange={(v) => updateLocation({ mapCaption: v })}
                multiline={false}
              />
            </figcaption>
          </figure>
        </div>
      </section>
    );
  };

  const renderFaq = (section: PageSection) => {
    const block = mergedDataForSection(data, section);
    const faq = block.faq;
    const editable = editMode && (section.isOriginal ? !!onChange : !!onSectionContentChange);
    const anchor = section.anchorId || "faq";

    const updateFaq = (fields: Partial<typeof faq>) => {
      if (section.isOriginal) {
        patchData((d) => ({ ...d, faq: { ...d.faq, ...fields } }));
      } else {
        patchSectionFields(section, fields);
      }
    };

    return (
      <section id={anchor} className="section wrap" data-section="faq">
        <div className="faq-layout">
          <div>
            <OakText
              className="eyebrow"
              value={faq.eyebrow}
              editMode={editable}
              onChange={(v) => updateFaq({ eyebrow: v })}
              multiline={false}
            />
            <OakText
              as="h2"
              className="faq-title"
              value={faq.title}
              editMode={editable}
              onChange={(v) => updateFaq({ title: v })}
              multiline={false}
            />
          </div>
          <div>
            {faq.items.map((item: OakFaqItem, i: number) => (
              <details key={i}>
                <summary>
                  <OakText
                    value={item.question}
                    editMode={editable}
                    onChange={(v) => {
                      const items = [...faq.items];
                      items[i] = { ...items[i], question: v };
                      updateFaq({ items });
                    }}
                    multiline={false}
                  />
                </summary>
                <p>
                  <OakText
                    value={item.answer}
                    editMode={editable}
                    onChange={(v) => {
                      const items = [...faq.items];
                      items[i] = { ...items[i], answer: v };
                      updateFaq({ items });
                    }}
                  />
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderRegister = (section: PageSection) => {
    const block = mergedDataForSection(data, section);
    const reg = block.register;
    const fp = block.floorplan;
    const editable = editMode && (section.isOriginal ? !!onChange : !!onSectionContentChange);
    const anchor = section.anchorId || DEFAULT_ANCHORS.register;
    const previewOnly = editMode || !leadLive;

    const updateRegister = (fields: Partial<typeof reg>) => {
      if (section.isOriginal) {
        patchData((d) => ({ ...d, register: { ...d.register, ...fields } }));
      } else {
        patchSectionFields(section, fields);
      }
    };

    return (
      <section id={anchor} className="section wrap" data-section="register">
        <div className="contact-grid">
          <div className="reveal">
            <OakText
              className="eyebrow"
              value={reg.eyebrow}
              editMode={editable}
              onChange={(v) => updateRegister({ eyebrow: v })}
              multiline={false}
            />
            <OakText
              as="h2"
              className="contact-title"
              value={reg.title}
              editMode={editable}
              onChange={(v) => updateRegister({ title: v })}
            />
            <OakText
              as="p"
              className="body-copy"
              value={reg.body}
              editMode={editable}
              onChange={(v) => updateRegister({ body: v })}
            />
            {previewOnly ? (
              <p className="photo-note" style={{ marginTop: 16 }}>
                미리보기 화면입니다. 입력 정보는 저장되지 않습니다.
              </p>
            ) : null}
          </div>
          <form id="lead-form" onSubmit={onFormSubmit} onInput={() => setFormResult((r) => ({ ...r, visible: false }))}>
            <label className="field">
              <span>이름 *</span>
              <input
                name="name"
                required
                maxLength={40}
                autoComplete="off"
                placeholder="이름"
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
              />
            </label>
            <label className="field">
              <span>휴대폰 번호 *</span>
              <input
                name="phone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={13}
                pattern="010-?[0-9]{4}-?[0-9]{4}"
                placeholder="010-0000-0000"
                title="010으로 시작하는 11자리 번호를 입력해주세요."
                onBlur={(e) => {
                  e.target.value = formatPhoneBlur(e.target.value);
                }}
              />
            </label>
            <label className="field">
              <span>관심 타입</span>
              <select name="type" ref={typeSelectRef} defaultValue="">
                <option value="">타입을 선택해주세요</option>
                {fp.plans.map((p) => (
                  <option key={p.id} value={p.name || p.id}>
                    {p.name || p.id}
                  </option>
                ))}
                <option value="미정">미정</option>
              </select>
            </label>
            <details className="privacy">
              <summary>
                <OakText
                  value={reg.privacySummary}
                  editMode={editable}
                  onChange={(v) => updateRegister({ privacySummary: v })}
                  multiline={false}
                />
              </summary>
              <p>
                <OakText
                  value={reg.privacyBody}
                  editMode={editable}
                  onChange={(v) => updateRegister({ privacyBody: v })}
                />
              </p>
            </details>
            <label className="check">
              <input type="checkbox" name="consent" required />
              <span>
                <OakText
                  value={reg.consentLabel}
                  editMode={editable}
                  onChange={(v) => updateRegister({ consentLabel: v })}
                  multiline={false}
                />
              </span>
            </label>
            {thirdPartyRequired ? (
              <label className="check">
                <input type="checkbox" name="thirdParty" required />
                <span>개인정보 제3자 제공에 동의합니다</span>
              </label>
            ) : null}
            <button className="filled" type="submit" disabled={submitting}>
              {editable ? (
                <OakText
                  value={reg.submitLabel}
                  editMode
                  onChange={(v) => updateRegister({ submitLabel: v })}
                  multiline={false}
                />
              ) : (
                reg.submitLabel
              )}
            </button>
            <div
              className="form-result"
              role="status"
              id="form-result"
              tabIndex={-1}
              ref={formResultRef}
              hidden={!formResult.visible}
            >
              {formResult.visible ? (
                <>
                  <strong>{formResult.title}</strong>
                  {formResult.detail ? <p>{formResult.detail}</p> : null}
                  {formResult.kind === "preview" ? (
                    <button
                      type="button"
                      className="pill"
                      onClick={() => {
                        setFormResult((r) => ({ ...r, visible: false }));
                        (
                          document.getElementById("lead-form")?.querySelector(
                            'input[name="name"]',
                          ) as HTMLInputElement | null
                        )?.focus();
                      }}
                    >
                      다시 체험하기 ↗
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    );
  };

  const renderSection = (section: PageSection) => {
    switch (section.sectionType) {
      case "hero":
        return <div key={section.id}>{renderHero(section)}</div>;
      case "overview":
        return <div key={section.id}>{renderOverview(section)}</div>;
      case "premium":
        return <div key={section.id}>{renderSpaces(section)}</div>;
      case "floorplan":
        return <div key={section.id}>{renderFloorplan(section)}</div>;
      case "location":
        return <div key={section.id}>{renderLocation(section)}</div>;
      case "faq":
        return <div key={section.id}>{renderFaq(section)}</div>;
      case "lead_form":
        return <div key={section.id}>{renderRegister(section)}</div>;
      case "legal":
      case "directions":
      default:
        return null;
    }
  };

  const lightboxGalleryPhoto: OakHeroPhoto | undefined =
    lightbox.open && lightbox.mode === "gallery" ? galleryPhotos[lightbox.index] : undefined;

  return (
    <div
      className="oak-editorial-root"
      data-template="oak-editorial"
      data-device={previewDevice === "mobile" || previewDevice === "tablet" ? previewDevice : undefined}
      ref={rootRef}
    >
      <a className="skip" href={`#${DEFAULT_ANCHORS.overview}`}>
        본문으로 이동
      </a>
      <div
        className="progress"
        aria-hidden="true"
        style={{ transform: `scaleX(${progressScale})` }}
      />

      <header>
        <div className="logo" aria-label={`${data.brandName} 브랜드`}>
          {(() => {
            const logoSrc = data.logoUrl?.trim() || SAMPLE_LOGO_URL;
            const isDefaultLogo = isDefaultSampleLogo(data.logoUrl);
            const logoNode = (
              <OakImage
                url={logoSrc}
                alt={data.brandName || "로고"}
                editMode={editMode && !!onChange}
                exactPixels={50}
                onChange={(url) => patchData((d) => ({ ...d, logoUrl: url }))}
                className={`logo-image${isDefaultLogo && editMode ? " logo-image--hint" : ""}`}
              />
            );
            return (
              <span className={`logo-media${isDefaultLogo && editMode ? " logo-media--hint" : ""}`}>
                {editMode ? (
                  logoNode
                ) : (
                  <a href="#top" className="logo-image-link" aria-label={`${data.brandName} 처음으로`}>
                    {logoNode}
                  </a>
                )}
                {editMode && isDefaultLogo ? (
                  <span className="logo-upload-hint" role="status">
                    로고를 50×50 사이즈 이미지로 교체해주세요.
                  </span>
                ) : null}
              </span>
            );
          })()}
          <a
            href="#top"
            className="logo-txt"
            onClick={(e) => {
              if (editMode) e.preventDefault();
            }}
          >
            <OakText
              as="b"
              value={data.logoText}
              editMode={editMode && !!onChange}
              onChange={(v) =>
                patchData(
                  (d) =>
                    linkOakSiteName(d, d.logoText, v) ?? {
                      ...d,
                      logoText: v,
                      brandName: v.trim() || d.brandName,
                    },
                )
              }
              multiline={false}
            />
            <OakText
              as="small"
              value={data.logoSubtitle}
              editMode={editMode && !!onChange}
              onChange={(v) => patchData((d) => ({ ...d, logoSubtitle: v }))}
              multiline={false}
            />
          </a>
        </div>
        <nav aria-label="주요 메뉴" id="nav" className={menuOpen ? "open" : undefined}>
          {gnbLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={closeMenu}>
              {link.label}
            </a>
          ))}
          <a className="mobile-register" href={`#${registerAnchor}`} onClick={closeMenu}>
            {data.nav.register}
          </a>
        </nav>
        <a className="pill" href={`#${registerAnchor}`}>
          {data.nav.register.replace(/\s*↗\s*$/, "")}{" "}
          <span className="arrow">↗</span>
        </a>
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="nav"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? "CLOSE −" : "MENU ＋"}
        </button>
      </header>

      <main id="top">{visibleSections.map((section) => renderSection(section))}</main>

      {visibleSections.some((section) => section.sectionType === "legal") ? (
        <footer className="wrap" id="legal">
          <div className="footer-top">
            <OakText
              className="eyebrow"
              value={data.footer.eyebrow}
              editMode={editMode && !!onChange}
              onChange={(v) => patchData((d) => ({ ...d, footer: { ...d.footer, eyebrow: v } }))}
            />
            <button
              type="button"
              className="motion-toggle"
              aria-pressed={reduceMotion}
              onClick={() => setUserReducedMotion((v) => !v)}
            >
              모션 줄이기 {reduceMotion ? "ON" : "OFF"}
            </button>
            <a className="line-link" href="#top">
              맨 위로 ↑
            </a>
          </div>
          <div className="footer-signature">
            <div className="footer-word" aria-hidden="true">
              <OakText
                value={data.footer.wordmark}
                editMode={editMode && !!onChange}
                onChange={(v) =>
                  patchData(
                    (d) =>
                      linkOakSiteName(d, d.footer.wordmark, v) ?? {
                        ...d,
                        footer: { ...d.footer, wordmark: v },
                      },
                  )
                }
                multiline={false}
              />
            </div>
            <OakText
              as="p"
              className="eyebrow"
              value={data.footer.tagline}
              editMode={editMode && !!onChange}
              onChange={(v) => patchData((d) => ({ ...d, footer: { ...d.footer, tagline: v } }))}
            />
          </div>
          <div className="footer-bottom">
            <OakText
              as="span"
              className="eyebrow"
              value={data.footer.copyright}
              editMode={editMode && !!onChange}
              onChange={(v) => patchData((d) => ({ ...d, footer: { ...d.footer, copyright: v } }))}
              multiline={false}
            />
            <OakText
              as="span"
              className="eyebrow"
              value={data.footer.credit}
              editMode={editMode && !!onChange}
              onChange={(v) => patchData((d) => ({ ...d, footer: { ...d.footer, credit: v } }))}
              multiline={false}
            />
          </div>
          {data.fontLicenseNote ? (
            <p className="photo-note" style={{ opacity: 0.55, paddingBottom: 20, fontSize: 12 }}>
              <OakText
                value={data.fontLicenseNote}
                editMode={editMode && !!onChange}
                onChange={(v) => patchData((d) => ({ ...d, fontLicenseNote: v }))}
                multiline={false}
              />
            </p>
          ) : null}
        </footer>
      ) : null}

      <aside
        className={floatingHidden ? "floating" : "floating is-in"}
        aria-hidden={floatingHidden || undefined}
        aria-label="관심고객 등록 바로가기"
      >
        <span>{data.floatingBrand}</span>
        <a href={`#${registerAnchor}`}>{data.floatingCta}</a>
      </aside>

      <dialog
        id="lightbox"
        ref={dialogRef}
        aria-labelledby="lightbox-title"
        onClose={() => setLightbox({ open: false })}
        onClick={(e) => {
          if (e.target === dialogRef.current) {
            const r = dialogRef.current.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            ) {
              setLightbox({ open: false });
            }
          }
        }}
        onKeyDown={(e) => {
          if (lightbox.open && lightbox.mode === "gallery") {
            if (e.key === "Escape") {
              setLightbox({ open: false });
              return;
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              setLightbox((prev) => {
                if (!prev.open || prev.mode !== "gallery") return prev;
                const len = galleryPhotos.length || 1;
                const delta = e.key === "ArrowRight" ? 1 : len - 1;
                return { open: true, mode: "gallery", index: (prev.index + delta) % len };
              });
            }
          } else if (e.key === "Escape") {
            setLightbox({ open: false });
          }
        }}
      >
        <div className="modal-head">
          <span className="eyebrow" id="lightbox-title">
            {lightbox.open && lightbox.mode === "gallery"
              ? lightboxGalleryPhoto?.label ?? "SPACE GALLERY"
              : lightbox.open && lightbox.mode === "plan"
                ? `${lightbox.planName} / CONCEPT PLAN`
                : "SPACE GALLERY"}
          </span>
          <button
            type="button"
            className="close"
            aria-label="확대 보기 닫기"
            onClick={() => setLightbox({ open: false })}
          >
            ×
          </button>
        </div>
        <div id="lightbox-content" ref={lightboxContentRef}>
          {lightbox.open && lightbox.mode === "gallery" && lightboxGalleryPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="lightbox-image"
              src={lightboxGalleryPhoto.src}
              alt={lightboxGalleryPhoto.alt}
            />
          ) : null}
          {lightbox.open && lightbox.mode === "plan" ? (
            <div className="modal-plan">
              {lightbox.floorplanImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lightbox.floorplanImageUrl} alt={`${lightbox.planName} 개념도`} />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: oakPlanSvg(lightbox.planId) }} />
              )}
            </div>
          ) : null}
        </div>
        <div className="lightbox-bottom">
          <span className="photo-note" id="lightbox-note">
            {lightbox.open && lightbox.mode === "gallery"
              ? `${lightbox.index + 1} / ${galleryPhotos.length} · 분위기 참고 이미지`
              : lightbox.open && lightbox.mode === "plan"
                ? "설계도면이 아닌 가상 개념도입니다."
                : ""}
          </span>
          <div id="gallery-controls" hidden={!(lightbox.open && lightbox.mode === "gallery")}>
            <button
              type="button"
              className="pill"
              id="prev-photo"
              aria-label="이전 사진"
              onClick={() =>
                setLightbox((prev) => {
                  if (!prev.open || prev.mode !== "gallery") return prev;
                  const len = galleryPhotos.length || 1;
                  return { open: true, mode: "gallery", index: (prev.index + len - 1) % len };
                })
              }
            >
              ←
            </button>
            <button
              type="button"
              className="pill"
              id="next-photo"
              aria-label="다음 사진"
              onClick={() =>
                setLightbox((prev) => {
                  if (!prev.open || prev.mode !== "gallery") return prev;
                  const len = galleryPhotos.length || 1;
                  return { open: true, mode: "gallery", index: (prev.index + 1) % len };
                })
              }
            >
              →
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
