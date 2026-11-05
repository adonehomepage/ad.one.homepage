"use client";

import { useCallback, useMemo, useState } from "react";
import { Pin } from "lucide-react";
import type { PresaleSectionKey } from "@midday/types/presale-landing";
import { PRESALE_SECTION_LABELS } from "@midday/types/presale-landing";
import { isPresaleFixedSection, isPresaleAlwaysVisibleSection, reorderPresaleSections } from "@midday/lib/presale-landing-normalize";
import { isLandingConsultantSectionEnabled } from "@midday/lib/consultant-feature-flags";

interface PresaleMobileSectionDrawerProps {
  open: boolean;
  onClose: () => void;
  visibleSections: Record<PresaleSectionKey, boolean>;
  sectionOrder: PresaleSectionKey[];
  onSectionOrderChange: (order: PresaleSectionKey[]) => void;
  onToggleSection: (key: PresaleSectionKey, visible: boolean) => void;
  onScrollToSection: (key: PresaleSectionKey) => void;
}

export function PresaleMobileSectionDrawer({
  open,
  onClose,
  visibleSections,
  sectionOrder,
  onSectionOrderChange,
  onToggleSection,
  onScrollToSection,
}: PresaleMobileSectionDrawerProps) {
  const [dragKey, setDragKey] = useState<PresaleSectionKey | null>(null);
  const consultantOn = isLandingConsultantSectionEnabled();
  const editorSectionOrder = useMemo(
    () => (consultantOn ? sectionOrder : sectionOrder.filter((key) => key !== "consultant")),
    [consultantOn, sectionOrder]
  );

  const draggableOrder = editorSectionOrder.filter((key) => !isPresaleFixedSection(key));

  const moveSection = useCallback(
    (key: PresaleSectionKey, dir: -1 | 1) => {
      const idx = draggableOrder.indexOf(key);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= draggableOrder.length) return;
      onSectionOrderChange(
        reorderPresaleSections(sectionOrder, key, draggableOrder[target]!)
      );
    },
    [draggableOrder, onSectionOrderChange, sectionOrder]
  );

  if (!open) return null;

  return (
    <div className="presale-mobile-drawer-overlay" onClick={onClose} role="presentation">
      <aside
        className="presale-mobile-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="섹션 목록"
      >
        <div className="presale-mobile-drawer-head">
          <h4>섹션</h4>
          <button type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        {editorSectionOrder.map((key) =>
          isPresaleFixedSection(key) ? (
            <div key={key} className="presale-sec-row presale-sec-row--mobile presale-sec-row--pinned">
              <span className="presale-sec-pin" aria-hidden>
                <Pin size={12} strokeWidth={2.25} />
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  onScrollToSection(key);
                  onClose();
                }}
              >
                {PRESALE_SECTION_LABELS[key]}
              </span>
              <input type="checkbox" checked disabled />
            </div>
          ) : (
            <div
              key={key}
              className="presale-sec-row presale-sec-row--mobile"
              draggable
              onDragStart={() => setDragKey(key)}
              onDragEnd={() => setDragKey(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragKey) onSectionOrderChange(reorderPresaleSections(sectionOrder, dragKey, key));
                setDragKey(null);
              }}
            >
              <div className="presale-sec-mobile-order">
                <button
                  type="button"
                  disabled={draggableOrder.indexOf(key) === 0}
                  aria-label="위로"
                  onClick={() => moveSection(key, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={draggableOrder.indexOf(key) === draggableOrder.length - 1}
                  aria-label="아래로"
                  onClick={() => moveSection(key, 1)}
                >
                  ↓
                </button>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={() => {
                  onScrollToSection(key);
                  onClose();
                }}
              >
                {PRESALE_SECTION_LABELS[key]}
              </span>
              {!isPresaleAlwaysVisibleSection(key) ? (
                <input
                  type="checkbox"
                  checked={visibleSections[key]}
                  onChange={(e) => onToggleSection(key, e.target.checked)}
                />
              ) : null}
            </div>
          )
        )}
      </aside>
    </div>
  );
}

export function PresaleMobileSectionFab({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="presale-mobile-sec-fab" onClick={onClick} aria-label="섹션 목록 열기">
      섹션
    </button>
  );
}
