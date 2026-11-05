"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Eye,
  FilePlus,
  Monitor,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react";
import type { PresaleLandingData, PresaleSectionKey } from "@midday/types/presale-landing";
import { PRESALE_SECTION_DOM_IDS } from "@midday/types/presale-landing";
import {
  isPresaleFixedSection,
  isPresaleAlwaysVisibleSection,
} from "@midday/lib/presale-landing-normalize";
import { isLandingConsultantSectionEnabled } from "@midday/lib/consultant-feature-flags";
import {
  PresaleMobileSectionDrawer,
  PresaleMobileSectionFab,
} from "./PresaleMobileSectionDrawer";
import { PresaleEditModeHint } from "./PresaleEditModeHint";
import { PresalePopupSettingsModal } from "./PresaleModals";
import { buildLandingEditorSelectUrl } from "@midday/lib/landing-builder-templates";

export type PresalePreviewViewport = "desktop" | "tablet" | "mobile";

interface PresaleEditorChromeProps {
  editMode: boolean;
  onToggleEditMode: () => void;
  onSaveDraft: () => void;
  onCreateNew?: () => void;
  createNewDisabled?: boolean;
  previewViewport?: PresalePreviewViewport;
  onPreviewViewportChange?: (viewport: PresalePreviewViewport) => void;
  onShowJson?: () => void;
  onRequestReview: () => void;
  visibleSections: Record<PresaleSectionKey, boolean>;
  sectionOrder: PresaleSectionKey[];
  onSectionOrderChange: (order: PresaleSectionKey[]) => void;
  popup: PresaleLandingData["popup"];
  onPopupChange: (popup: PresaleLandingData["popup"]) => void;
  onPreviewPopup: (options?: { returnToSettings?: boolean }) => void;
  popupSettingsOpen: boolean;
  onPopupSettingsOpenChange: (open: boolean) => void;
  onToggleSection: (key: PresaleSectionKey, visible: boolean) => void;
  onScrollToSection: (key: PresaleSectionKey) => void;
  mobileDrawerOpen: boolean;
  onMobileDrawerOpen: () => void;
  onMobileDrawerClose: () => void;
  /** 기존 랜딩 수정·재신청 플로우면 CTA를「재신청」으로 표시 */
  isResubmit?: boolean;
  /** 좌측 나가기 버튼 (2step 기본: 랜딩페이지 설정 → 템플릿 선택) */
  exitHref?: string;
  exitLabel?: string;
  /** 섹션 목록·모바일 섹션 FAB 숨김 (호갱노노 등) */
  hideSectionList?: boolean;
}

export function PresaleEditorChrome({
  editMode,
  onToggleEditMode,
  onSaveDraft,
  onCreateNew,
  createNewDisabled = false,
  previewViewport = "desktop",
  onPreviewViewportChange,
  onShowJson,
  onRequestReview,
  visibleSections,
  sectionOrder,
  onSectionOrderChange,
  popup,
  onPopupChange,
  onPreviewPopup,
  popupSettingsOpen,
  onPopupSettingsOpenChange,
  onToggleSection,
  onScrollToSection,
  mobileDrawerOpen,
  onMobileDrawerOpen,
  onMobileDrawerClose,
  isResubmit = false,
  exitHref = buildLandingEditorSelectUrl(),
  exitLabel = "랜딩페이지 설정",
  hideSectionList = false,
}: PresaleEditorChromeProps) {
  const consultantOn = isLandingConsultantSectionEnabled();
  const hiddenSectionCount = useMemo(
    () => {
      if (hideSectionList) return 0;
      return sectionOrder.filter((key) => {
        if (key === "whyZigbang" || key === "faq") return false;
        if (key === "consultant" && !consultantOn) return false;
        return (
          !isPresaleFixedSection(key) &&
          !isPresaleAlwaysVisibleSection(key) &&
          !visibleSections[key]
        );
      }).length;
    },
    [sectionOrder, visibleSections, consultantOn, hideSectionList]
  );

  return (
    <>
      <header
        className="presale-editor-bar"
        aria-label="랜딩페이지 편집기"
      >
        <div className="presale-editor-bar__inner presale-inner">
          <div className="presale-editor-bar__lead">
            <Link
              href={exitHref}
              className="presale-editor-exit"
              aria-label={`${exitLabel}으로 이동`}
              onClick={(e) => {
                if (exitHref.includes("new=1") && !exitHref.includes("template=")) {
                  const ok = window.confirm(
                    "템플릿 선택 화면으로 돌아갈까요?\n\n저장하지 않은 편집 내용은 유지되지 않을 수 있습니다."
                  );
                  if (!ok) e.preventDefault();
                }
              }}
            >
              <span className="presale-editor-exit__icon" aria-hidden>
                <ChevronLeft size={17} strokeWidth={2.25} />
              </span>
              <span className="presale-editor-exit__label">{exitLabel}</span>
            </Link>
            <span className="presale-editor-bar__divider" aria-hidden />
            <div className="presale-editor-bar__brand">
              <span className="presale-editor-bar__eyebrow">Landing Builder</span>
              <span className="presale-editor-bar__title">
                {editMode ? "랜딩페이지 제작" : "미리보기"}
              </span>
            </div>
          </div>

          {!editMode && onPreviewViewportChange ? (
            <nav
              className="presale-editor-bar__center presale-editor-viewport-toolbar"
              aria-label="화면 크기"
            >
              {(
                [
                  { id: "desktop" as const, label: "PC", icon: Monitor },
                  { id: "tablet" as const, label: "태블릿", icon: Tablet },
                  { id: "mobile" as const, label: "모바일", icon: Smartphone },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`presale-editor-viewport-btn${
                    previewViewport === id ? " is-active" : ""
                  }`}
                  aria-pressed={previewViewport === id}
                  onClick={() => onPreviewViewportChange(id)}
                >
                  <Icon size={14} strokeWidth={2.25} aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          ) : null}

          <div className="presale-editor-bar__actions">
            {!editMode ? (
              <button
                type="button"
                className={`presale-editor-tool presale-editor-tool--popup${
                  popup.enabled ? "" : " presale-editor-tool--muted"
                }`}
                onClick={() => onPreviewPopup()}
                disabled={!popup.enabled}
                title={
                  popup.enabled
                    ? "이벤트 팝업 미리보기"
                    : "편집 계속에서 이벤트 팝업을 켜면 미리볼 수 있습니다"
                }
              >
                <Sparkles size={15} strokeWidth={2.25} aria-hidden />
                <span>이벤트 팝업</span>
              </button>
            ) : null}
            <nav className="presale-editor-toolbar" aria-label="편집 도구">
              {editMode ? (
                <>
                  {!isResubmit && onCreateNew ? (
                    <button
                      type="button"
                      className="presale-editor-tool"
                      onClick={onCreateNew}
                      disabled={createNewDisabled}
                      title="초기 템플릿으로 새 랜딩 시작"
                    >
                      <FilePlus size={15} strokeWidth={2.25} aria-hidden />
                      <span>새로 만들기</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="presale-editor-tool"
                    onClick={onSaveDraft}
                    title="이름을 붙여 체크포인트를 저장·복원"
                  >
                    <Save size={15} strokeWidth={2.25} aria-hidden />
                    <span>임시 저장</span>
                  </button>
                </>
              ) : null}
              <button type="button" className="presale-editor-tool" onClick={onToggleEditMode}>
                <Eye size={15} strokeWidth={2.25} aria-hidden />
                <span>{editMode ? "미리보기" : "편집 계속"}</span>
              </button>
            </nav>
            <button type="button" className="presale-editor-cta" onClick={onRequestReview}>
              {isResubmit ? "재신청" : "제작 신청"}
            </button>
          </div>
        </div>
      </header>

      {!editMode ? (
        <div className="presale-preview-mode-banner" role="status">
          <span>고객에게 보이는 화면입니다. 문구·이미지는 「편집 계속」에서 수정하세요.</span>
          {hiddenSectionCount > 0 ? (
            <span className="presale-preview-mode-banner__badge">
              숨김 섹션 {hiddenSectionCount}개 제외됨
            </span>
          ) : null}
        </div>
      ) : (
        <PresaleEditModeHint visible />
      )}

      <PresalePopupSettingsModal
        open={popupSettingsOpen}
        popup={popup}
        onChange={onPopupChange}
        onClose={() => onPopupSettingsOpenChange(false)}
        onPreview={onPreviewPopup}
      />

      {editMode && !hideSectionList ? <PresaleMobileSectionFab onClick={onMobileDrawerOpen} /> : null}
      {!hideSectionList ? (
        <PresaleMobileSectionDrawer
          open={mobileDrawerOpen && editMode}
          onClose={onMobileDrawerClose}
          visibleSections={visibleSections}
          sectionOrder={sectionOrder}
          onSectionOrderChange={onSectionOrderChange}
          onToggleSection={onToggleSection}
          onScrollToSection={onScrollToSection}
        />
      ) : null}
    </>
  );
}

export function scrollToPresaleSection(key: PresaleSectionKey) {
  const el = document.getElementById(PRESALE_SECTION_DOM_IDS[key]);
  if (!el) return;
  const scroller = el.closest("[data-preview-scroll]");
  if (scroller instanceof HTMLElement) {
    const top =
      el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
    scroller.scrollTo({ top: Math.max(0, top - 12), behavior: "smooth" });
    return;
  }
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}
