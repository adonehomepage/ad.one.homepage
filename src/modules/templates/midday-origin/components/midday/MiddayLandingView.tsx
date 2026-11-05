"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Plus, X } from "lucide-react";
import type { PresaleLandingData, PresaleSectionKey } from "@midday/types/presale-landing";
import {
  PRESALE_SECTION_DOM_IDS,
  PRESALE_SECTION_LABELS,
  PRESALE_CONSULTANT_BADGE_LABEL,
  PRESALE_TRUST_TAG_MAX,
  PRESALE_CONSULTANT_DEFAULT_PROFILE_URL,
  PRESALE_GALLERY_MAX,
  PRESALE_LOCATION_MAP_DEFAULT_IMAGE,
  PRESALE_SITE_MATRIX_DEFAULTS,
  presaleGalleryImageLabel,
} from "@midday/types/presale-landing";
import { isDefaultSampleLogo } from "@/modules/templates/definitions";
import {
  applyPresaleLinkedPhone,
  applyPresaleLinkedSiteName,
  patchProductLegacySpec,
  resolveInterestTypeFormOptions,
  withFloorplanTypesAndInterestSync,
} from "@midday/lib/presale-landing-normalize";
import { EditableText } from "@midday/components/EditableText";
import { EditableImage } from "@midday/components/EditableImage";
import { PresaleFloatDock } from "@midday/components/PresaleFloatDock";
import { PresaleEventPopup } from "@midday/components/PresaleModals";
import { usePresaleEventPopup } from "@midday/components/usePresaleEventPopup";
import { usePresaleViewportDevice } from "@midday/components/usePresaleViewportDevice";
import { PresaleGnbNav } from "@midday/components/PresaleGnbNav";
import { PresaleThumbGallery } from "@midday/components/PresaleThumbGallery";
import { PresaleGlassTrustTag } from "@midday/components/PresaleGlassTrustTag";
import { MiddayTitleReveal } from "./MiddayTitleReveal";
import { PremiumCursorPeek } from "./PremiumCursorPeek";
import {
  createDefaultPremiumCard,
  PRESALE_PREMIUM_MIN_CARDS,
} from "@midday/lib/presale-premium-icons";
import { isLandingConsultantSectionEnabled } from "@midday/lib/consultant-feature-flags";
import { openExternalRegisterUrl } from "@midday/lib/landing-external-register-url";
import { PresaleRegisterModal } from "@midday/components/PresaleRegisterModal";
import { scrollToPresaleSection } from "@midday/components/PresaleEditorChrome";
import "../presale-landing.css";
import "./midday-landing.css";
import "./lumiere-original-sections.css";
/* 애드잇 Tailwind preflight 상쇄만 — 원본 CSS 파일은 그대로 둔다 */
import "./midday-adit-ua-restore.css";
import "./midday-adit-section-layout.css";

interface MiddayLandingViewProps {
  data: PresaleLandingData;
  editMode: boolean;
  onChange: (
    data: PresaleLandingData | ((prev: PresaleLandingData) => PresaleLandingData)
  ) => void;
  onRegisterClick?: () => void;
  projectId?: string;
  contactDemoMode?: boolean;
  previewDevice?: "desktop" | "tablet" | "mobile";
  /** 애드잇 편집기 팝업 미리보기만 — 기본 공개 동작은 원본과 동일 */
  forcePopup?: boolean;
  onClosePopup?: () => void;
}

function hideClass(visible: boolean) {
  return visible ? "" : "midday-hidden";
}

const LUMIERE_SITE_AERIAL = "/images/presale/lumiere/site-aerial.png";
const LUMIERE_PREMIUM_INTERIOR = "/images/presale/lumiere/premium-interior.png";
const MIDDAY_PREMIUM_MAX_CARDS = 4;
const Arrow = () => <span aria-hidden="true">↗</span>;

const SITE_MATRIX = [
  { key: "specLocation" as const, titleFallback: "행복역 도보 5분" },
  { key: "specScale" as const, titleFallback: "완성형 생활 인프라" },
  { key: "specSupplyType" as const, titleFallback: "안심 교육 환경" },
  { key: "specArea" as const, titleFallback: "도심 속 녹색 일상" },
];

function serial(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function MiddayLandingView({
  data,
  editMode,
  onChange,
  onRegisterClick,
  projectId,
  contactDemoMode = false,
  previewDevice,
  forcePopup = false,
  onClosePopup,
}: MiddayLandingViewProps) {
  const [viewFloorplanTypeIndex, setViewFloorplanTypeIndex] = useState(data.floorplan.activeTypeIndex);
  const [premiumSlideIndex, setPremiumSlideIndex] = useState(0);
  const [premiumHoverIndex, setPremiumHoverIndex] = useState<number | null>(null);
  const [showFloatRegister, setShowFloatRegister] = useState(false);
  const [floorplanLightbox, setFloorplanLightbox] = useState<{ url: string; label: string } | null>(
    null
  );
  const [gnbScrolled, setGnbScrolled] = useState(false);
  const [regModalOpen, setRegModalOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const heroMediaRef = useRef<HTMLDivElement>(null);
  const viewportDevice = usePresaleViewportDevice(previewDevice);
  const isCompactViewport = !editMode && viewportDevice !== "desktop";
  const { eventPopupOpen, dismissEventPopup } = usePresaleEventPopup(
    Boolean(data.popup.enabled),
    editMode && !forcePopup,
    forcePopup,
  );

  const consultantFeaturesOn = isLandingConsultantSectionEnabled();
  const visibleSections = useMemo(
    () => ({
      ...data.visibleSections,
      whyZigbang: false,
      faq: false,
      consultant: consultantFeaturesOn && Boolean(data.visibleSections.consultant),
    }),
    [consultantFeaturesOn, data.visibleSections]
  );

  useEffect(() => {
    setViewFloorplanTypeIndex(data.floorplan.activeTypeIndex);
  }, [data.floorplan.activeTypeIndex]);

  useEffect(() => {
    if (!floorplanLightbox) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFloorplanLightbox(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [floorplanLightbox]);

  const activeFloorplanTypeIndex = editMode
    ? data.floorplan.activeTypeIndex
    : viewFloorplanTypeIndex;

  const patch = useCallback(
    (fn: (d: PresaleLandingData) => PresaleLandingData) => {
      onChange((prev) => fn(prev));
    },
    [onChange]
  );

  const setContactPhone = useCallback(
    (phone: string) => {
      patch((d) => applyPresaleLinkedPhone(d, phone));
    },
    [patch]
  );

  const setBrandSiteName = useCallback(
    (siteName: string) => {
      patch((d) => applyPresaleLinkedSiteName(d, siteName));
    },
    [patch]
  );

  const setBrandSubtitle = useCallback(
    (subtitle: string) => {
      patch((d) => ({
        ...d,
        gnb: { ...d.gnb, navSubtitle: subtitle },
        footer: { ...d.footer, subtitle },
      }));
    },
    [patch]
  );

  const scrollToPageTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const key = Object.entries(PRESALE_SECTION_DOM_IDS).find(([, domId]) => domId === id)?.[0] as
      | PresaleSectionKey
      | undefined;
    if (key) {
      scrollToPresaleSection(key);
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const sectionOrder = data.sectionOrder;

  const handleExternalRegister = useCallback(() => {
    if (editMode) return;
    const ok = openExternalRegisterUrl(data.register.externalRegisterUrl);
    if (!ok) {
      window.alert("관심고객 등록 URL이 설정되지 않았습니다. 편집기에서 외부 URL을 입력해 주세요.");
    }
  }, [editMode, data.register.externalRegisterUrl]);

  /** Adit 내장 관심고객 모달. 외부 URL은 보조 링크로만 연다. */
  const handleRegister = useCallback(() => {
    if (editMode) return;
    if (onRegisterClick) {
      onRegisterClick();
      return;
    }
    setRegModalOpen(true);
  }, [editMode, onRegisterClick]);

  const interestTypeFormOptions = resolveInterestTypeFormOptions(data);

  const setHeroMainImage = useCallback(
    (url: string) => {
      patch((d) => {
        const galleryImages = [...d.product.galleryImages];
        if (galleryImages[0]) {
          galleryImages[0] = { ...galleryImages[0], url };
        } else {
          galleryImages.push({ url, label: presaleGalleryImageLabel(0) });
        }
        return {
          ...d,
          product: {
            ...d.product,
            mainImage: { ...d.product.mainImage, url },
            galleryImages,
          },
        };
      });
    },
    [patch]
  );

  const setPremiumSlideImage = useCallback(
    (index: number, url: string) => {
      patch((d) => {
        const galleryImages = [...d.premium.galleryImages];
        if (galleryImages[index]) {
          galleryImages[index] = { ...galleryImages[index], url };
        } else {
          galleryImages.push({ url, label: presaleGalleryImageLabel(galleryImages.length) });
        }
        const cards = d.premium.cards.map((card, i) =>
          i === index ? { ...card, imageUrl: url } : card
        );
        return { ...d, premium: { ...d.premium, galleryImages, cards } };
      });
    },
    [patch]
  );

  const setPremiumCardImage = useCallback(
    (index: number, url: string) => {
      patch((d) => {
        const cards = [...d.premium.cards];
        if (!cards[index]) return d;
        cards[index] = { ...cards[index], imageUrl: url };
        const galleryImages = [...d.premium.galleryImages];
        if (galleryImages[index]) {
          galleryImages[index] = { ...galleryImages[index], url };
        } else if (url) {
          galleryImages.push({ url, label: presaleGalleryImageLabel(galleryImages.length) });
        }
        return { ...d, premium: { ...d.premium, cards, galleryImages } };
      });
    },
    [patch]
  );

  const addOverviewRow = () => {
    patch((d) => {
      if (d.overview.rows.length >= 20) return d;
      return {
        ...d,
        overview: {
          ...d.overview,
          rows: [...d.overview.rows, { label: "항목명", value: "내용 입력" }],
        },
      };
    });
  };

  const removeOverviewRow = (index: number) => {
    patch((d) => {
      if (d.overview.rows.length <= 1) return d;
      return {
        ...d,
        overview: {
          ...d.overview,
          rows: d.overview.rows.filter((_, i) => i !== index),
        },
      };
    });
  };

  const addPremiumCard = () => {
    patch((d) => {
      if (d.premium.cards.length >= MIDDAY_PREMIUM_MAX_CARDS) return d;
      return {
        ...d,
        premium: {
          ...d.premium,
          cards: [...d.premium.cards, createDefaultPremiumCard(d.premium.cards.length)],
        },
      };
    });
  };

  const removePremiumCard = (index: number) => {
    patch((d) => {
      if (d.premium.cards.length <= PRESALE_PREMIUM_MIN_CARDS) return d;
      return {
        ...d,
        premium: {
          ...d.premium,
          cards: d.premium.cards.filter((_, i) => i !== index),
        },
      };
    });
  };

  const addTrustTag = () => {
    patch((d) => {
      if (d.product.trustTags.length >= PRESALE_TRUST_TAG_MAX) return d;
      return {
        ...d,
        product: { ...d.product, trustTags: [...d.product.trustTags, "새 태그"] },
      };
    });
  };

  const removeTrustTag = (index: number) => {
    patch((d) => {
      if (d.product.trustTags.length <= 1) return d;
      return {
        ...d,
        product: {
          ...d.product,
          trustTags: d.product.trustTags.filter((_, i) => i !== index),
        },
      };
    });
  };

  const addPerk = () => {
    patch((d) => ({
      ...d,
      register: {
        ...d.register,
        perks: [...d.register.perks, "혜택 항목을 입력하세요"],
      },
    }));
  };

  const removePerk = (index: number) => {
    patch((d) => ({
      ...d,
      register: {
        ...d.register,
        perks: d.register.perks.filter((_, i) => i !== index),
      },
    }));
  };

  const addFloorplanSpec = (typeIndex: number) => {
    patch((d) => {
      const types = [...d.floorplan.types];
      const specs = [...types[typeIndex].specs, { label: "항목명", value: "내용 입력" }];
      if (specs.length > 12) return d;
      types[typeIndex] = { ...types[typeIndex], specs };
      return withFloorplanTypesAndInterestSync(d, types);
    });
  };

  const removeFloorplanSpec = (typeIndex: number, specIndex: number) => {
    patch((d) => {
      if (d.floorplan.types[typeIndex].specs.length <= 1) return d;
      const types = [...d.floorplan.types];
      types[typeIndex] = {
        ...types[typeIndex],
        specs: types[typeIndex].specs.filter((_, i) => i !== specIndex),
      };
      return withFloorplanTypesAndInterestSync(d, types);
    });
  };

  const addFloorplanType = () => {
    patch((d) => {
      if (d.floorplan.types.length >= 12) return d;
      const n = d.floorplan.types.length;
      const types = [
        ...d.floorplan.types,
        {
          id: `type-${Date.now()}`,
          tabLabel: `타입${n + 1}`,
          typeLabel: `TYPE ${n + 1}`,
          title: "전용 ㎡",
          images: [{ url: "", label: presaleGalleryImageLabel(0) }],
          activeImageIndex: 0,
          specs: [
            { label: "전용면적", value: "㎡" },
            { label: "구성", value: "방 · 욕실" },
            { label: "세대수", value: "-" },
            { label: "분양가", value: "-" },
          ],
        },
      ];
      return withFloorplanTypesAndInterestSync(d, types, { activeTypeIndex: n });
    });
  };

  const removeFloorplanType = (index: number) => {
    patch((d) => {
      if (d.floorplan.types.length <= 1) return d;
      const types = d.floorplan.types.filter((_, i) => i !== index);
      const activeTypeIndex = Math.min(
        d.floorplan.activeTypeIndex >= index
          ? Math.max(0, d.floorplan.activeTypeIndex - 1)
          : d.floorplan.activeTypeIndex,
        types.length - 1
      );
      return withFloorplanTypesAndInterestSync(d, types, { activeTypeIndex });
    });
  };

  const isDefaultGnbLogo = useMemo(
    () => isDefaultSampleLogo(data.gnb.logoUrl),
    [data.gnb.logoUrl],
  );

  const consultantInitial = data.consultant.name.trim().slice(0, 1) || "김";
  const linkedConsultantSlug = data.consultant.consultantSlug?.trim() || "";
  const consultantFieldsLocked = Boolean(linkedConsultantSlug);
  const consultantProfileUrl =
    data.consultant.profileUrl?.trim() || PRESALE_CONSULTANT_DEFAULT_PROFILE_URL;
  const consultantPhone =
    data.consultant.phone?.trim() || (consultantFieldsLocked ? "" : data.gnb.phone);

  const heroImageUrl =
    data.product.mainImage?.url?.trim() ||
    data.product.galleryImages[0]?.url?.trim() ||
    "";

  const sectionStyle = (key: PresaleSectionKey): CSSProperties => {
    const idx = sectionOrder.indexOf(key);
    return { order: idx < 0 ? 999 : idx };
  };

  const overviewStats = data.overview.stats ?? [];
  const premiumCards = data.premium.cards.slice(0, MIDDAY_PREMIUM_MAX_CARDS);
  const premiumCardImage = (index: number) =>
    premiumCards[index]?.imageUrl?.trim() ||
    data.premium.galleryImages[index]?.url?.trim() ||
    "";
  const premiumSlides = useMemo(() => {
    const urls = premiumCards.map(
      (card, i) =>
        card.imageUrl?.trim() ||
        data.premium.galleryImages[i]?.url?.trim() ||
        ""
    );
    const filled = urls.filter(Boolean);
    return filled.length > 0 ? urls.map((url) => url || filled[0] || LUMIERE_PREMIUM_INTERIOR) : [LUMIERE_PREMIUM_INTERIOR];
  }, [premiumCards, data.premium.galleryImages]);

  useEffect(() => {
    setPremiumSlideIndex((i) => (premiumSlides.length ? i % premiumSlides.length : 0));
  }, [premiumSlides.length]);

  useEffect(() => {
    if (editMode || premiumSlides.length < 2 || premiumHoverIndex !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setPremiumSlideIndex((i) => (i + 1) % premiumSlides.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [editMode, premiumSlides.length, premiumHoverIndex]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || editMode) {
      setShowFloatRegister(false);
      setGnbScrolled(false);
      return;
    }

    const scrollRoot =
      (root.closest("[data-preview-scroll]") as Element | null) ?? null;
    const hero = root.querySelector(".lc-hero");
    const register = root.querySelector(`#${PRESALE_SECTION_DOM_IDS.register}`);
    let heroVisible = true;
    let registerVisible = false;
    const syncFloat = () => {
      setShowFloatRegister(!heroVisible && !registerVisible);
    };
    const floatIo = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target === hero) {
            heroVisible = entry.isIntersecting;
            setGnbScrolled(!heroVisible);
          }
          if (entry.target === register) registerVisible = entry.isIntersecting;
        }
        syncFloat();
      },
      { root: scrollRoot, threshold: 0.14 }
    );
    if (hero) floatIo.observe(hero);
    if (register) floatIo.observe(register);

    return () => floatIo.disconnect();
  }, [editMode, data.visibleSections, data.sectionOrder]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".midday-rise");
    if (editMode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("is-inview"));
      return;
    }
    const scrollRoot =
      (root.closest("[data-preview-scroll]") as Element | null) ?? null;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("is-inview");
        }
      },
      { root: scrollRoot, threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [editMode, data.visibleSections, data.sectionOrder, data.premium.cards.length]);

  const siteHeroUrl =
    data.site.mainImage?.url?.trim() ||
    data.site.thumbImages[0]?.url?.trim() ||
    LUMIERE_SITE_AERIAL;

  const locationMapDisplayUrl =
    data.location.mapImageUrl?.trim() || PRESALE_LOCATION_MAP_DEFAULT_IMAGE;
  const openLocationMap = () => {
    const href = data.location.naverMapUrl.trim();
    if (!href) return;
    const url = href.startsWith("http://") || href.startsWith("https://") ? href : `https://${href}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const rootClass = [
    "midday-landing presale-landing",
    editMode ? "midday-edit-mode presale-edit-mode" : "",
    isCompactViewport && viewportDevice === "tablet" ? "presale-preview-device--tablet" : "",
    isCompactViewport && viewportDevice === "mobile" ? "presale-preview-device--mobile" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const activeFloorType = data.floorplan.types[activeFloorplanTypeIndex] ?? data.floorplan.types[0];

  return (
    <div ref={rootRef} className={rootClass}>
      {eventPopupOpen && (!editMode || forcePopup) ? (
        <PresaleEventPopup
          title={data.popup.title}
          description={data.popup.description}
          ctaLabel={data.popup.ctaLabel}
          imageUrl={data.popup.imageUrl}
          perks={data.popup.perks}
          disclaimer={data.popup.disclaimer}
          phone={data.popup.phone}
          onRegister={handleRegister}
          onClose={(hideToday) => {
            dismissEventPopup(hideToday);
            onClosePopup?.();
          }}
          viewportDevice={viewportDevice !== "desktop" ? viewportDevice : undefined}
        />
      ) : null}
      {/* ── GNB ── */}
      <header className={`lc-gnb${gnbScrolled ? " is-scrolled" : ""}`}>
        <div className="lc-gnb__inner">
          <div className="presale-logo">
            {editMode ? (
              <div
                className={`presale-logo-mark${isDefaultGnbLogo ? " presale-logo-mark--hint" : ""}`}
              >
                <EditableImage
                  url={data.gnb.logoUrl}
                  editMode={editMode}
                  imageRole="logo"
                  aspect="contain"
                  className={`presale-logo-img${isDefaultGnbLogo ? " presale-logo-img--replace-hint" : ""}`}
                  onChange={(v) => patch((d) => ({ ...d, gnb: { ...d.gnb, logoUrl: v } }))}
                />
                {isDefaultGnbLogo ? (
                  <span className="presale-logo-hint-callout" role="status">
                    로고를 50x50사이즈 이미지로 교체해주세요.
                  </span>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                className="presale-logo-img-btn"
                onClick={scrollToPageTop}
                aria-label="페이지 상단으로 이동"
              >
                <EditableImage
                  url={data.gnb.logoUrl}
                  editMode={false}
                  imageRole="logo"
                  aspect="contain"
                  className="presale-logo-img"
                  onChange={() => {}}
                />
              </button>
            )}
            <a
              href={`#${PRESALE_SECTION_DOM_IDS.product}`}
              className="presale-logo-txt"
              onClick={(e) => {
                e.preventDefault();
                if (editMode) return;
                scrollToSection(PRESALE_SECTION_DOM_IDS.product);
              }}
            >
              <EditableText
                as="b"
                value={data.gnb.siteName}
                editMode={editMode}
                multiline={false}
                onChange={setBrandSiteName}
              />
              <EditableText
                as="small"
                value={data.gnb.navSubtitle}
                editMode={editMode}
                multiline={false}
                onChange={setBrandSubtitle}
              />
            </a>
          </div>

          <div className="lc-gnb__end">
            <PresaleGnbNav
              sectionOrder={sectionOrder}
              visibleSections={visibleSections}
              editMode={editMode}
              className="lc-gnb__nav presale-menu"
            />

            <div className="lc-gnb__actions">
              <span className="lc-gnb__phone">
                <small className="lc-gnb__phone-label">문의번호</small>
                {!editMode && data.gnb.phone?.replace(/\D/g, "") ? (
                  <a href={`tel:${data.gnb.phone.replace(/\D/g, "")}`}>
                    <EditableText
                      as="span"
                      value={data.gnb.phone}
                      editMode={editMode}
                      multiline={false}
                      onChange={setContactPhone}
                    />
                  </a>
                ) : (
                  <EditableText
                    as="span"
                    value={data.gnb.phone}
                    editMode={editMode}
                    multiline={false}
                    onChange={setContactPhone}
                  />
                )}
              </span>
              <button type="button" className="lc-gnb__cta lc-gnb__cta--fill" onClick={handleRegister}>
                관심고객등록
                <span className="lc-gnb__cta-arrow" aria-hidden>
                  →
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="lc-sections">
        {/* ── HERO / product ── */}
        <section
          ref={heroRef}
          id={PRESALE_SECTION_DOM_IDS.product}
          className={`lc-hero ${hideClass(data.visibleSections.product)}`.trim()}
          style={{
            ...sectionStyle("product"),
            ...(heroImageUrl
              ? { ["--lc-hero-bg" as string]: `url(${JSON.stringify(heroImageUrl)})` }
              : null),
          }}
        >
          <div ref={heroMediaRef} className="lc-hero__img">
            <EditableImage
              url={heroImageUrl}
              label={data.product.mainImage?.label || "대표 이미지"}
              editMode={editMode}
              imageRole="hero"
              onChange={setHeroMainImage}
            />
          </div>
          <div className="lc-hero__shade" aria-hidden />

          <div className="lc-hero__content">
            <div className="lc-hero__head">
              <div className="lc-hero__brand">
                <EditableText
                  as="p"
                  className="lc-hero__label"
                  value={data.product.badge}
                  editMode={editMode}
                  multiline={false}
                  onChange={(v) => patch((d) => ({ ...d, product: { ...d.product, badge: v } }))}
                />
                <MiddayTitleReveal
                  as="h1"
                  className="lc-hero__title"
                  text={data.product.siteName}
                  editMode={editMode}
                  onChange={setBrandSiteName}
                />
              </div>
              <div className="lc-hero__slogan-slot">
                <EditableText
                  as="p"
                  className="lc-hero__slogan"
                  value={data.product.lead}
                  editMode={editMode}
                  onChange={(v) => patch((d) => ({ ...d, product: { ...d.product, lead: v } }))}
                />
              </div>
            </div>

            <div className="lc-hero__spacer" aria-hidden />

            <div className="lc-hero__footer">
              <div className="lc-hero__mid">
                <aside className="lc-price-panel" aria-label="분양가">
                  <EditableText
                    as="p"
                    className="lc-price-panel__label"
                    value={data.product.priceLabel}
                    editMode={editMode}
                    multiline={false}
                    onChange={(v) =>
                      patch((d) => ({ ...d, product: { ...d.product, priceLabel: v } }))
                    }
                  />
                  <p className="lc-price-panel__row">
                    <EditableText
                      as="span"
                      className="lc-price-panel__type"
                      value={data.product.priceType}
                      editMode={editMode}
                      multiline={false}
                      onChange={(v) =>
                        patch((d) => ({ ...d, product: { ...d.product, priceType: v } }))
                      }
                    />
                    <EditableText
                      as="span"
                      className="lc-price-panel__main"
                      value={data.product.priceMain}
                      editMode={editMode}
                      multiline={false}
                      onChange={(v) =>
                        patch((d) => ({ ...d, product: { ...d.product, priceMain: v } }))
                      }
                    />
                  </p>
                  <EditableText
                    as="p"
                    className="lc-price-panel__sub"
                    value={data.product.priceSub}
                    editMode={editMode}
                    multiline={false}
                    onChange={(v) =>
                      patch((d) => ({ ...d, product: { ...d.product, priceSub: v } }))
                    }
                  />
                  {data.product.priceNote || editMode ? (
                    <EditableText
                      as="p"
                      className="lc-price-panel__note"
                      value={data.product.priceNote}
                      editMode={editMode}
                      onChange={(v) =>
                        patch((d) => ({ ...d, product: { ...d.product, priceNote: v } }))
                      }
                    />
                  ) : null}
                </aside>
              </div>

              <div className="lc-hero__bottom">
                <div className={`lc-trust-tags${editMode ? " presale-trust--edit" : ""}`}>
                  {data.product.trustTags.map((tag, i) => (
                    <PresaleGlassTrustTag
                      key={`tag-${i}-${heroImageUrl}`}
                      heroRef={heroRef}
                      mediaRef={heroMediaRef}
                      imageUrl={heroImageUrl}
                      className="lc-trust-tag"
                    >
                      <EditableText
                        as="span"
                        value={tag}
                        editMode={editMode}
                        multiline={false}
                        placeholder="태그 문구"
                        onChange={(v) =>
                          patch((d) => {
                            const trustTags = [...d.product.trustTags];
                            trustTags[i] = v;
                            return { ...d, product: { ...d.product, trustTags } };
                          })
                        }
                      />
                      {editMode && data.product.trustTags.length > 1 ? (
                        <button
                          type="button"
                          className="presale-trust-del"
                          aria-label="태그 삭제"
                          onClick={() => removeTrustTag(i)}
                        >
                          <X size={11} strokeWidth={2.25} aria-hidden />
                        </button>
                      ) : null}
                    </PresaleGlassTrustTag>
                  ))}
                  {editMode && data.product.trustTags.length < PRESALE_TRUST_TAG_MAX ? (
                    <button type="button" className="presale-trust-add" onClick={addTrustTag}>
                      <Plus size={12} strokeWidth={2.25} aria-hidden />
                      <span>태그 추가</span>
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="lc-pill lc-pill--light lc-pill--hero-cta"
                  onClick={handleRegister}
                >
                  분양 안내 받기
                  <span className="lc-pill__arrow" aria-hidden>
                    ↗
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ── OVERVIEW ── */}
        <section
          id={PRESALE_SECTION_DOM_IDS.overview}
          className={`overview section-light ${hideClass(data.visibleSections.overview)}`.trim()}
          style={sectionStyle("overview")}
        >
          <div className="section-no">01 / PROJECT</div>
          <div className="overview-title">
            <p className="eyebrow">사업개요</p>
            <MiddayTitleReveal
              as="h2"
              className="midday-section-title presale-section-title-edit"
              text={
                data.overview.title?.trim() &&
                data.overview.title.trim() !== PRESALE_SECTION_LABELS.overview
                  ? data.overview.title
                  : "중심을 누리는\n완성된 주거"
              }
              editMode={editMode}
              onChange={(v) =>
                patch((d) => ({ ...d, overview: { ...d.overview, title: v } }))
              }
            />
          </div>
          <div className="overview-copy midday-rise">
            <EditableText
              as="p"
              value={data.overview.description}
              editMode={editMode}
              onChange={(v) =>
                patch((d) => ({ ...d, overview: { ...d.overview, description: v } }))
              }
            />
            <dl className={`data-list${editMode ? " presale-overview--edit" : ""}`}>
              {data.overview.rows.map((row, i) => (
                <div key={`ov-${i}`}>
                  <dt>
                    {editMode ? (
                      <EditableText
                        as="span"
                        value={row.label}
                        editMode={editMode}
                        multiline={false}
                        placeholder="항목명"
                        onChange={(v) =>
                          patch((d) => {
                            const rows = [...d.overview.rows];
                            rows[i] = { ...rows[i], label: v };
                            return { ...d, overview: { ...d.overview, rows } };
                          })
                        }
                      />
                    ) : (
                      row.label
                    )}
                  </dt>
                  <dd>
                    <div className="presale-overview-value-wrap">
                      <EditableText
                        as="span"
                        className="presale-overview-value"
                        value={row.value}
                        editMode={editMode}
                        multiline={false}
                        placeholder="내용 입력"
                        onChange={(v) =>
                          patch((d) => {
                            const rows = [...d.overview.rows];
                            rows[i] = { ...rows[i], value: v };
                            return { ...d, overview: { ...d.overview, rows } };
                          })
                        }
                      />
                      {editMode && data.overview.rows.length > 1 ? (
                        <button
                          type="button"
                          className="presale-overview-del"
                          aria-label="항목 삭제"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={() => removeOverviewRow(i)}
                        >
                          <X size={12} strokeWidth={2.25} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
            {editMode && data.overview.rows.length < 20 ? (
              <button type="button" className="presale-overview-add" onClick={addOverviewRow}>
                <Plus size={13} strokeWidth={2.25} aria-hidden />
                <span>항목 추가</span>
              </button>
            ) : null}
          </div>
          {overviewStats.length > 0 ? (
            <div className="number-strip midday-rise midday-rise-stagger">
              {overviewStats.map((stat, i) => (
                <div key={`stat-${i}`}>
                  <strong>
                    <EditableText
                      as="span"
                      value={stat.value}
                      editMode={editMode}
                      multiline={false}
                      onChange={(v) =>
                        patch((d) => {
                          const stats = [...(d.overview.stats ?? [])];
                          stats[i] = { ...stats[i], value: v };
                          return { ...d, overview: { ...d.overview, stats } };
                        })
                      }
                    />
                  </strong>
                  <span>
                    <EditableText
                      as="span"
                      value={stat.label}
                      editMode={editMode}
                      multiline={false}
                      onChange={(v) =>
                        patch((d) => {
                          const stats = [...(d.overview.stats ?? [])];
                          stats[i] = { ...stats[i], label: v };
                          return { ...d, overview: { ...d.overview, stats } };
                        })
                      }
                    />
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* ── SITE ── */}
        <section
          id={PRESALE_SECTION_DOM_IDS.site}
          className={`site-section ${hideClass(data.visibleSections.site)}`.trim()}
          style={sectionStyle("site")}
        >
          <div className="site-visual">
            <EditableImage
              url={siteHeroUrl}
              label="입지 이미지"
              editMode={editMode}
              imageRole="panel"
              aspect="cover"
              onChange={(url) =>
                patch((d) => ({
                  ...d,
                  site: {
                    ...d.site,
                    mainImage: { ...d.site.mainImage, url },
                    thumbImages:
                      d.site.thumbImages.length > 0
                        ? [{ ...d.site.thumbImages[0], url }, ...d.site.thumbImages.slice(1)]
                        : [{ url, label: presaleGalleryImageLabel(0) }],
                  },
                }))
              }
            />
          </div>
          <div className="site-copy">
            <p className="eyebrow">입지조건</p>
            <MiddayTitleReveal
              as="h2"
              className="midday-section-title presale-section-title-edit"
              text={data.site.title || "가까울수록,\n삶은 커집니다"}
              editMode={editMode}
              onChange={(v) => patch((d) => ({ ...d, site: { ...d.site, title: v } }))}
            />
            <EditableText
              as="p"
              className="lead"
              value={data.site.description}
              editMode={editMode}
              onChange={(v) => patch((d) => ({ ...d, site: { ...d.site, description: v } }))}
            />
            <div className="location-matrix midday-rise midday-rise-stagger">
              {SITE_MATRIX.map(({ key, titleFallback }, index) => {
                const defaults = PRESALE_SITE_MATRIX_DEFAULTS[index];
                const cat = data.site.matrixLabels?.[index] || defaults.cat;
                const blurb = data.site.matrixBlurbs?.[index] || defaults.blurb;
                return (
                  <div key={key}>
                    <EditableText
                      as="span"
                      className="location-matrix-cat"
                      value={cat}
                      editMode={editMode}
                      multiline={false}
                      onChange={(v) =>
                        patch((d) => {
                          const matrixLabels = PRESALE_SITE_MATRIX_DEFAULTS.map(
                            (item, i) =>
                              i === index ? v : d.site.matrixLabels?.[i] || item.cat
                          );
                          return { ...d, site: { ...d.site, matrixLabels } };
                        })
                      }
                    />
                    <strong>
                      <EditableText
                        as="span"
                        value={data.product[key] || titleFallback}
                        editMode={editMode}
                        multiline={false}
                        onChange={(v) =>
                          patch((d) => ({
                            ...d,
                            product: patchProductLegacySpec(d.product, key, v),
                          }))
                        }
                      />
                    </strong>
                    <EditableText
                      as="p"
                      value={blurb}
                      editMode={editMode}
                      multiline={false}
                      onChange={(v) =>
                        patch((d) => {
                          const matrixBlurbs = PRESALE_SITE_MATRIX_DEFAULTS.map(
                            (item, i) =>
                              i === index ? v : d.site.matrixBlurbs?.[i] || item.blurb
                          );
                          return { ...d, site: { ...d.site, matrixBlurbs } };
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── PREMIUM ── */}
        <section
          id={PRESALE_SECTION_DOM_IDS.premium}
          className={`premium section-light ${hideClass(data.visibleSections.premium)}`.trim()}
          style={sectionStyle("premium")}
        >
          <div className="premium-head">
            <div>
              <p className="eyebrow">프리미엄</p>
              <MiddayTitleReveal
                as="h2"
                className="midday-section-title presale-section-title-edit"
                text={
                    (data.premium.copyHeadline || data.premium.title || "모든 순간을\n특별하게")
                    .replace(/\|/g, "")
                    .replace(/바다를 마주하고,\s*센텀을 품다/, "바다를 마주하고,\n센텀을 품다")
                    .replace(/노을을 마주하고,\s*수변을 품다/, "노을을 마주하고,\n수변을 품다")
                }
                editMode={editMode}
                onChange={(v) =>
                  patch((d) => ({ ...d, premium: { ...d.premium, copyHeadline: v } }))
                }
              />
            </div>
            <EditableText
              as="p"
              className="midday-rise"
              value={
                data.premium.copyBody ||
                data.premium.description ||
                "집 안에서 단지 전체까지, 보이는 곳과 보이지 않는 곳 모두에 세심한 기준을 담았습니다."
              }
              editMode={editMode}
              onChange={(v) => patch((d) => ({ ...d, premium: { ...d.premium, copyBody: v } }))}
            />
          </div>
          <div className="premium-grid midday-rise">
            <article className="premium-image">
              <div className="premium-image__frame" aria-hidden="true" />
              <div className="premium-image__slides">
                {premiumSlides.map((url, i) => (
                  <div
                    key={`ps-${i}-${url}`}
                    className={`premium-image__slide${i === premiumSlideIndex ? " is-active" : ""}`}
                  >
                    <EditableImage
                      url={url}
                      label="프리미엄 이미지"
                      editMode={editMode && i === premiumSlideIndex}
                      imageRole="panel"
                      aspect="cover"
                      onChange={(next) => setPremiumSlideImage(i, next)}
                    />
                  </div>
                ))}
              </div>
              {premiumSlides.length > 1 ? (
                <div className="premium-image__dots" role="tablist" aria-label="프리미엄 이미지">
                  {premiumSlides.map((_, i) => (
                    <button
                      key={`dot-${i}`}
                      type="button"
                      role="tab"
                      aria-selected={i === premiumSlideIndex}
                      className={i === premiumSlideIndex ? "is-active" : ""}
                      onClick={() => setPremiumSlideIndex(i)}
                    />
                  ))}
                </div>
              ) : null}
            </article>
            {premiumCards.map((card, i) => {
              const hoverSrc = premiumCardImage(i);
              return (
              <article
                key={`pc-${i}`}
                className={[
                  i === premiumCards.length - 1 ? "clay-card" : "",
                  premiumHoverIndex === i ? "is-hot" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined}
                onPointerEnter={(e) => {
                  if (editMode || !hoverSrc || e.pointerType === "touch") return;
                  setPremiumHoverIndex(i);
                  setPremiumSlideIndex(i);
                }}
                onPointerLeave={() => {
                  if (premiumHoverIndex === i) setPremiumHoverIndex(null);
                }}
              >
                {editMode && premiumCards.length > PRESALE_PREMIUM_MIN_CARDS ? (
                  <button
                    type="button"
                    className="presale-feat-del"
                    aria-label="카드 삭제"
                    onClick={() => removePremiumCard(i)}
                  >
                    <X size={14} strokeWidth={2.25} aria-hidden />
                  </button>
                ) : null}
                {editMode ? (
                  <div className="premium-card-photo">
                    <EditableImage
                      url={hoverSrc}
                      label={`${card.title || "카드"} 호버 이미지`}
                      editMode
                      imageRole="panel"
                      aspect="cover"
                      onChange={(next) => setPremiumCardImage(i, next)}
                    />
                  </div>
                ) : null}
                <span>{serial(i)}</span>
                <h3>
                  <EditableText
                    as="span"
                    value={card.title}
                    editMode={editMode}
                    onChange={(v) =>
                      patch((d) => {
                        const cards = [...d.premium.cards];
                        cards[i] = { ...cards[i], title: v };
                        return { ...d, premium: { ...d.premium, cards } };
                      })
                    }
                  />
                </h3>
                <EditableText
                  as="p"
                  value={card.description}
                  editMode={editMode}
                  onChange={(v) =>
                    patch((d) => {
                      const cards = [...d.premium.cards];
                      cards[i] = { ...cards[i], description: v };
                      return { ...d, premium: { ...d.premium, cards } };
                    })
                  }
                />
              </article>
              );
            })}
          </div>
          {editMode && premiumCards.length < MIDDAY_PREMIUM_MAX_CARDS ? (
            <button type="button" className="presale-feat-add" onClick={addPremiumCard}>
              <Plus size={16} strokeWidth={2.25} aria-hidden />
              <span>카드 추가</span>
            </button>
          ) : null}
          <PremiumCursorPeek
            src={premiumHoverIndex !== null ? premiumCardImage(premiumHoverIndex) : ""}
            active={!editMode && premiumHoverIndex !== null}
          />
        </section>

        {/* ── FLOORPLAN ── */}
        <section
          id={PRESALE_SECTION_DOM_IDS.floorplan}
          className={`floorplan ${hideClass(data.visibleSections.floorplan)}`.trim()}
          style={sectionStyle("floorplan")}
        >
          <div className="floor-head">
            <p className="eyebrow">평면안내</p>
            <MiddayTitleReveal
              as="h2"
              className="midday-section-title presale-section-title-edit"
              text={data.floorplan.title || "생활을 읽은\n정교한 설계"}
              editMode={editMode}
              onChange={(v) =>
                patch((d) => ({ ...d, floorplan: { ...d.floorplan, title: v } }))
              }
            />
          </div>
          {editMode ? (
            <p className="unit-tabs-hint">타입 이름을 클릭해 수정 · 삭제는 탭 오른쪽 버튼</p>
          ) : null}
          <div className={`unit-tabs${editMode ? " unit-tabs--edit" : ""}`} role="tablist" aria-label="주택형 선택">
            {data.floorplan.types.map((t, i) => {
              const isActive = i === activeFloorplanTypeIndex;
              if (editMode) {
                return (
                  <div
                    key={t.id}
                    className={`presale-type-chip ${isActive ? "is-active" : ""} presale-type-chip--edit`}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      className={isActive ? "active" : ""}
                      onClick={() =>
                        patch((d) => ({
                          ...d,
                          floorplan: { ...d.floorplan, activeTypeIndex: i },
                        }))
                      }
                    >
                      <span
                        className="presale-tab-edit-wrap"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EditableText
                          as="span"
                          value={t.tabLabel}
                          editMode={editMode}
                          multiline={false}
                          onChange={(v) =>
                            patch((d) => {
                              const types = [...d.floorplan.types];
                              types[i] = { ...types[i], tabLabel: v };
                              return withFloorplanTypesAndInterestSync(d, types);
                            })
                          }
                        />
                      </span>
                    </button>
                    {data.floorplan.types.length > 1 ? (
                      <button
                        type="button"
                        className="presale-type-chip-remove"
                        aria-label={`${t.tabLabel} 타입 삭제`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFloorplanType(i);
                        }}
                      >
                        <X size={12} strokeWidth={2.25} aria-hidden />
                      </button>
                    ) : null}
                  </div>
                );
              }
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={isActive ? "active" : ""}
                  onClick={() => setViewFloorplanTypeIndex(i)}
                >
                  {t.tabLabel}
                </button>
              );
            })}
            {editMode && data.floorplan.types.length < 12 ? (
              <button type="button" className="presale-type-chip-add" onClick={addFloorplanType}>
                <Plus size={13} strokeWidth={2.25} aria-hidden />
                <span>타입 추가</span>
              </button>
            ) : null}
          </div>
          {activeFloorType ? (
            <div className="unit-content">
              <div key={activeFloorType.id} className="lc-floor-drawing">
                <PresaleThumbGallery
                  images={activeFloorType.images}
                  activeIndex={activeFloorType.activeImageIndex}
                  onActiveIndexChange={(activeImageIndex) =>
                    patch((d) => {
                      const types = [...d.floorplan.types];
                      const idx = activeFloorplanTypeIndex;
                      if (!types[idx]) return d;
                      types[idx] = { ...types[idx], activeImageIndex };
                      return withFloorplanTypesAndInterestSync(d, types);
                    })
                  }
                  onImagesChange={(images) =>
                    patch((d) => {
                      const types = [...d.floorplan.types];
                      const idx = activeFloorplanTypeIndex;
                      if (!types[idx]) return d;
                      types[idx] = { ...types[idx], images };
                      return withFloorplanTypesAndInterestSync(d, types);
                    })
                  }
                  editMode={editMode}
                  layout="horizontal"
                  mainAspect="contain"
                  mainClassName="presale-type-floorplan-hero"
                  galleryClassName="presale-type-floorplan-gallery"
                  maxImages={PRESALE_GALLERY_MAX}
                  onMainPreviewClick={
                    !editMode
                      ? (url, label) =>
                          setFloorplanLightbox({
                            url,
                            label: `${activeFloorType.tabLabel} ${label}`,
                          })
                      : undefined
                  }
                />
              </div>
              <div className="unit-info midday-rise">
                <EditableText
                  as="p"
                  className="unit-code"
                  value={activeFloorType.typeLabel}
                  editMode={editMode}
                  multiline={false}
                  onChange={(v) =>
                    patch((d) => {
                      const types = [...d.floorplan.types];
                      const idx = activeFloorplanTypeIndex;
                      if (!types[idx]) return d;
                      types[idx] = { ...types[idx], typeLabel: v };
                      return withFloorplanTypesAndInterestSync(d, types);
                    })
                  }
                />
                <h3>
                  <EditableText
                    as="span"
                    value={activeFloorType.title}
                    editMode={editMode}
                    onChange={(v) =>
                      patch((d) => {
                        const types = [...d.floorplan.types];
                        const idx = activeFloorplanTypeIndex;
                        if (!types[idx]) return d;
                        types[idx] = { ...types[idx], title: v };
                        return withFloorplanTypesAndInterestSync(d, types);
                      })
                    }
                  />
                </h3>
                <EditableText
                  as="p"
                  value={data.floorplan.description}
                  editMode={editMode}
                  onChange={(v) =>
                    patch((d) => ({ ...d, floorplan: { ...d.floorplan, description: v } }))
                  }
                />
                <dl className={`data-list${editMode ? " presale-overview--edit" : ""}`}>
                  {activeFloorType.specs.map((spec, si) => (
                    <div key={`${activeFloorType.id}-s-${si}`}>
                      <dt>
                        {editMode ? (
                          <EditableText
                            as="span"
                            value={spec.label}
                            editMode={editMode}
                            multiline={false}
                            placeholder="항목명"
                            onChange={(v) =>
                              patch((d) => {
                                const types = [...d.floorplan.types];
                                const idx = activeFloorplanTypeIndex;
                                if (!types[idx]) return d;
                                const specs = [...types[idx].specs];
                                specs[si] = { ...specs[si], label: v };
                                types[idx] = { ...types[idx], specs };
                                return withFloorplanTypesAndInterestSync(d, types);
                              })
                            }
                          />
                        ) : (
                          spec.label
                        )}
                      </dt>
                      <dd>
                        <div className="presale-overview-value-wrap">
                          <EditableText
                            as="span"
                            className="presale-overview-value"
                            value={spec.value}
                            editMode={editMode}
                            multiline={false}
                            placeholder="내용 입력"
                            onChange={(v) =>
                              patch((d) => {
                                const types = [...d.floorplan.types];
                                const idx = activeFloorplanTypeIndex;
                                if (!types[idx]) return d;
                                const specs = [...types[idx].specs];
                                specs[si] = { ...specs[si], value: v };
                                types[idx] = { ...types[idx], specs };
                                return withFloorplanTypesAndInterestSync(d, types);
                              })
                            }
                          />
                          {editMode && activeFloorType.specs.length > 1 ? (
                            <button
                              type="button"
                              className="presale-list-del presale-list-del--on-dark"
                              aria-label="항목 삭제"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => removeFloorplanSpec(activeFloorplanTypeIndex, si)}
                            >
                              <X size={12} strokeWidth={2.25} aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </dd>
                    </div>
                  ))}
                </dl>
                {editMode && activeFloorType.specs.length < 12 ? (
                  <button
                    type="button"
                    className="presale-type-spec-add"
                    onClick={() => addFloorplanSpec(activeFloorplanTypeIndex)}
                  >
                    <Plus size={13} strokeWidth={2.25} aria-hidden />
                    <span>항목 추가</span>
                  </button>
                ) : null}
                <small>※ 평면도 및 면적은 제작 과정에서 변경될 수 있으며 실제 계약 시 반드시 확인하시기 바랍니다.</small>
              </div>
            </div>
          ) : null}
        </section>

        {/* FAQ 섹션은 애드잇 출시 범위에서 제외 (visibleSections.faq 강제 false) */}

        {/* ── REGISTER ── */}
        <section
          id={PRESALE_SECTION_DOM_IDS.register}
          className={`register ${hideClass(data.visibleSections.register)}`.trim()}
          style={sectionStyle("register")}
        >
          <div>
            <p className="eyebrow">관심고객 등록</p>
            <MiddayTitleReveal
              as="h2"
              className="midday-section-title presale-section-title-edit"
              text={data.register.copyHeadline || data.register.title || "지금 등록하면\n먼저 받는 혜택"}
              editMode={editMode}
              onChange={(v) =>
                patch((d) => ({ ...d, register: { ...d.register, copyHeadline: v } }))
              }
            />
          </div>
          <div className="register-copy midday-rise midday-rise-stagger">
            <EditableText
              as="p"
              value={
                data.register.copyBody ||
                data.register.description
              }
              editMode={editMode}
              onChange={(v) =>
                patch((d) => ({ ...d, register: { ...d.register, copyBody: v } }))
              }
            />
            <ul className={editMode ? "presale-perk presale-perk--edit" : undefined}>
              {data.register.perks.map((perk, i) => (
                <li key={i}>
                  <EditableText
                    as="span"
                    className="presale-perk-text"
                    value={perk}
                    editMode={editMode}
                    multiline={false}
                    onChange={(v) =>
                      patch((d) => {
                        const perks = [...d.register.perks];
                        perks[i] = v;
                        return { ...d, register: { ...d.register, perks } };
                      })
                    }
                  />
                  {editMode && data.register.perks.length > 1 ? (
                    <button
                      type="button"
                      className="presale-list-del"
                      aria-label="혜택 삭제"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={() => removePerk(i)}
                    >
                      <X size={14} strokeWidth={2.25} aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
            {editMode ? (
              <button type="button" className="presale-perk-add" onClick={addPerk}>
                <Plus size={13} strokeWidth={2.25} aria-hidden />
                <span>혜택 항목 추가</span>
              </button>
            ) : null}
            <div className="register-cta">
              {editMode || data.register.bottomPhone.replace(/^📞\s*/, "").trim() ? (
                <a
                  className="register-phone"
                  href={
                    editMode || !data.register.bottomPhone.replace(/\D/g, "")
                      ? undefined
                      : `tel:${data.register.bottomPhone.replace(/\D/g, "")}`
                  }
                  onClick={(e) => {
                    if (editMode) e.preventDefault();
                  }}
                >
                  <span className="register-phone__label">문의번호</span>
                  <EditableText
                    as="span"
                    className="register-phone__num"
                    value={data.register.bottomPhone.replace(/^📞\s*/, "")}
                    editMode={editMode}
                    multiline={false}
                    onChange={setContactPhone}
                  />
                </a>
              ) : null}
              <button
                type="button"
                className="pill pill-clay"
                onClick={handleRegister}
                disabled={editMode}
              >
                관심고객 등록하기 <Arrow />
              </button>
            </div>
            {editMode ? (
              <p className="lc-hint" style={{ marginTop: 16 }}>
                CTA는 이 페이지의 관심고객 등록 모달을 엽니다. 외부 폼 URL이 있으면 아래에서 보조
                링크로도 열 수 있습니다.
                {data.register.externalRegisterUrl?.trim()
                  ? " (외부 URL이 저장되어 있습니다.)"
                  : " (외부 URL은 선택 사항입니다.)"}
              </p>
            ) : data.register.externalRegisterUrl?.trim() ? (
              <p className="lc-hint" style={{ marginTop: 16 }}>
                <button type="button" className="underline" onClick={handleExternalRegister}>
                  외부 등록 페이지로 이동
                </button>
              </p>
            ) : null}
          </div>
        </section>

        {/* ── CONSULTANT ── */}
        {consultantFeaturesOn ? (
          <section
            id={PRESALE_SECTION_DOM_IDS.consultant}
            className={`lc-consultant ${hideClass(visibleSections.consultant)}`.trim()}
            style={sectionStyle("consultant")}
          >
            <div className="lc-wrap">
              <div className="lc-consultant__card midday-rise">
                <div className="lc-consultant__mark">
                  <EditableImage
                    url={data.consultant.imageUrl}
                    editMode={editMode && !consultantFieldsLocked}
                    variant="avatar"
                    fallbackText={consultantInitial}
                    onChange={(url) => {
                      if (linkedConsultantSlug) return;
                      patch((d) => ({
                        ...d,
                        consultant: { ...d.consultant, imageUrl: url },
                      }));
                    }}
                  />
                </div>
                <p className="lc-eyebrow">{PRESALE_CONSULTANT_BADGE_LABEL}</p>
                <h3 className="lc-consultant__name">
                  <EditableText
                    as="span"
                    value={data.consultant.name}
                    editMode={editMode && !consultantFieldsLocked}
                    multiline={false}
                    onChange={(v) =>
                      patch((d) => ({
                        ...d,
                        consultant: { ...d.consultant, name: v },
                      }))
                    }
                  />
                </h3>
                <EditableText
                  as="p"
                  className="lc-consultant__role"
                  value={data.consultant.description}
                  editMode={editMode && !consultantFieldsLocked}
                  onChange={(v) =>
                    patch((d) => ({
                      ...d,
                      consultant: { ...d.consultant, description: v },
                    }))
                  }
                />
                <div className="lc-consultant__actions">
                  {!editMode && consultantPhone?.replace(/\D/g, "") ? (
                    <a
                      className="lc-pill lc-pill--outline lc-pill--sm"
                      href={`tel:${consultantPhone.replace(/\D/g, "")}`}
                    >
                      전화 상담
                    </a>
                  ) : null}
                  {!editMode ? (
                    <a
                      className="lc-pill lc-pill--dark lc-pill--sm"
                      href={consultantProfileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      프로필 보기
                    </a>
                  ) : null}
                  {!editMode && data.consultant.kakaoChannelUrl?.trim() ? (
                    <a
                      className="lc-pill lc-pill--clay lc-pill--sm"
                      href={data.consultant.kakaoChannelUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      카카오 상담
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── LOCATION ── */}
        <section
          id={PRESALE_SECTION_DOM_IDS.location}
          className={`location ${hideClass(data.visibleSections.location)}`.trim()}
          style={sectionStyle("location")}
        >
          <div className="location-copy midday-rise">
            <p className="eyebrow">
              <EditableText
                as="span"
                value={data.location.headingVenueLabel || "견본주택"}
                editMode={editMode}
                multiline={false}
                placeholder="견본주택"
                onChange={(v) =>
                  patch((d) => ({
                    ...d,
                    location: { ...d.location, headingVenueLabel: v },
                  }))
                }
              />
              {" 오시는 길"}
            </p>
            <MiddayTitleReveal
              as="h2"
              className="midday-section-title presale-section-title-edit"
              text={data.location.placeName || "루미에르 센트럴\n주택전시관"}
              editMode={editMode}
              onChange={(v) =>
                patch((d) => ({
                  ...d,
                  location: { ...d.location, placeName: v },
                }))
              }
            />
            <dl className="data-list">
              {(
                [
                  ["주소", "address"],
                  ["운영시간", "hours"],
                  ["전화", "phone"],
                ] as const
              ).map(([label, key]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    <EditableText
                      as="span"
                      value={data.location[key]}
                      editMode={editMode}
                      onChange={(v) => {
                        if (key === "phone") {
                          setContactPhone(v);
                          return;
                        }
                        patch((d) => ({
                          ...d,
                          location: { ...d.location, [key]: v },
                        }));
                      }}
                    />
                  </dd>
                </div>
              ))}
              <div>
                <dt>안내</dt>
                <dd>
                  <EditableText
                    as="span"
                    value={data.location.note}
                    editMode={editMode}
                    onChange={(v) =>
                      patch((d) => ({
                        ...d,
                        location: { ...d.location, note: v },
                      }))
                    }
                  />
                </dd>
              </div>
            </dl>
            {editMode ? (
              <div className="presale-map-editor">
                <label htmlFor="midday-map-link-url">지도 링크 (선택 · 클릭 시 새 탭)</label>
                <input
                  id="midday-map-link-url"
                  type="url"
                  placeholder="https://naver.me/… · map.naver.com …"
                  value={data.location.naverMapUrl}
                  onChange={(e) =>
                    patch((d) => ({
                      ...d,
                      location: { ...d.location, naverMapUrl: e.target.value },
                    }))
                  }
                />
                <p className="presale-map-editor-hint">
                  네이버 지도는 보안 정책상 페이지 안에 삽입할 수 없습니다.{" "}
                  <strong>약도 이미지</strong>를 등록하고, 링크를 넣으면 방문자가 이미지를 눌러 지도
                  앱으로 이동합니다.
                </p>
              </div>
            ) : null}
            {!editMode && data.location.naverMapUrl.trim() ? (
              <a
                className="pill pill-dark"
                href={data.location.naverMapUrl.trim()}
                target="_blank"
                rel="noreferrer"
              >
                네이버 지도 열기 <Arrow />
              </a>
            ) : (
              <button type="button" className="pill pill-dark">
                네이버 지도 열기 <Arrow />
              </button>
            )}
          </div>
          <div className="map-card midday-rise">
            <div
              className={`map-card__media presale-map-box${
                !editMode && data.location.naverMapUrl.trim() ? " presale-map-box--link" : ""
              }`}
            >
              <EditableImage
                url={locationMapDisplayUrl}
                label="오시는 길 약도 이미지"
                editMode={editMode}
                imageRole="panel"
                aspect="cover"
                className="presale-map-image"
                onChange={(url) =>
                  patch((d) => ({
                    ...d,
                    location: { ...d.location, mapImageUrl: url },
                  }))
                }
                onPreviewClick={
                  !editMode && data.location.naverMapUrl.trim() ? openLocationMap : undefined
                }
              />
              {!editMode && data.location.naverMapUrl.trim() ? (
                <span className="presale-map-open-hint" aria-hidden>
                  지도에서 보기
                </span>
              ) : null}
            </div>
          </div>
        </section>

      </div>

      {/* ── FOOTER ── */}
      <footer className="lc-footer">
        <div className="lc-wrap">
          <div className="lc-footer__top">
            <div>
              <EditableText
                as="h2"
                className="lc-footer__title"
                value={data.footer.siteName}
                editMode={editMode}
                multiline={false}
                onChange={setBrandSiteName}
              />
              <EditableText
                as="p"
                className="lc-footer__sub"
                value={data.footer.subtitle}
                editMode={editMode}
                multiline={false}
                onChange={setBrandSubtitle}
              />
            </div>
            <div>
              <p className="lc-footer__phone">
                <EditableText
                  as="span"
                  value={data.footer.phone}
                  editMode={editMode}
                  multiline={false}
                  onChange={setContactPhone}
                />
              </p>
              <EditableText
                as="div"
                className="lc-footer__info"
                value={data.footer.info}
                editMode={editMode}
                onChange={(v) => patch((d) => ({ ...d, footer: { ...d.footer, info: v } }))}
              />
            </div>
          </div>
          <div className="lc-footer__bottom">
            <span>© {data.footer.siteName || data.gnb.siteName}</span>
            <span>문의번호 · {data.footer.phone || data.gnb.phone}</span>
          </div>
        </div>
      </footer>

      {/* ── Floating register CTA + brand apps ── */}
      {!editMode ? (
        <div
          className={`presale-float-consultant-rail lc-float-rail${
            isCompactViewport ? " presale-float-consultant-rail--compact" : ""
          }`}
        >
          <div className="presale-float-sticky-stack">
            <PresaleFloatDock
              phone={data.gnb.phone}
              visible={showFloatRegister}
              onRegister={handleRegister}
              collapsible={isCompactViewport}
              hideBrandApps
            />
          </div>
        </div>
      ) : null}

      {/* ── Mobile fixed CTA ── */}
      <div className="lc-mobile-fixed-cta">
        <button type="button" className="lc-pill lc-pill--clay" onClick={handleRegister}>
          관심고객 등록
        </button>
      </div>

      {floorplanLightbox ? (
        <div
          className="presale-lightbox-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={floorplanLightbox.label}
          onClick={() => setFloorplanLightbox(null)}
        >
          <button
            type="button"
            className="presale-lightbox-close"
            aria-label="닫기"
            onClick={() => setFloorplanLightbox(null)}
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={floorplanLightbox.url}
            alt={floorplanLightbox.label}
            className="presale-lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      <PresaleRegisterModal
        open={regModalOpen}
        onClose={() => setRegModalOpen(false)}
        projectId={projectId}
        demoMode={contactDemoMode}
        interestTypeOptions={interestTypeFormOptions}
        privacyContactName={data.register.privacyContactName}
      />
    </div>
  );
}
