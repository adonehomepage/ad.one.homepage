"use client";

import { useMemo } from "react";
import type { PresaleSectionKey } from "@midday/types/presale-landing";
import { PRESALE_SECTION_DOM_IDS, PRESALE_SECTION_LABELS } from "@midday/types/presale-landing";
import { getPresaleGnbNavKeys } from "@midday/lib/presale-landing-normalize";
import { scrollToPresaleSection } from "./PresaleEditorChrome";

interface PresaleGnbNavProps {
  sectionOrder: PresaleSectionKey[];
  visibleSections: Record<PresaleSectionKey, boolean>;
  editMode: boolean;
  className?: string;
  /** 화보형 등 모바일 드로어 */
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

/** GNB 섹션 앵커 — premium / midday / serenoa 공통 */
export function PresaleGnbNav({
  sectionOrder,
  visibleSections,
  editMode,
  className = "presale-menu",
  mobileOpen,
  onNavigate,
}: PresaleGnbNavProps) {
  const keys = useMemo(
    () => getPresaleGnbNavKeys(sectionOrder, visibleSections),
    [sectionOrder, visibleSections]
  );

  if (keys.length === 0) return null;

  return (
    <nav
      className={className}
      aria-label="랜딩 내비게이션"
      data-open={mobileOpen ? "true" : undefined}
    >
      {keys.map((key) => (
        <a
          key={key}
          href={`#${PRESALE_SECTION_DOM_IDS[key]}`}
          onClick={(e) => {
            if (editMode) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            onNavigate?.();
            scrollToPresaleSection(key);
          }}
        >
          {PRESALE_SECTION_LABELS[key]}
        </a>
      ))}
    </nav>
  );
}
