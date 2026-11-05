"use client";

import { useEffect, useState } from "react";
import { MousePointerClick, X } from "lucide-react";
import {
  dismissPresaleEditHint,
  isPresaleEditHintDismissed,
} from "@midday/lib/presale-editor-edit-hint";

interface PresaleEditModeHintProps {
  visible: boolean;
}

export function PresaleEditModeHint({ visible }: PresaleEditModeHintProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setOpen(false);
      return;
    }
    setOpen(!isPresaleEditHintDismissed());
  }, [visible]);

  if (!visible || !open) return null;

  const handleDismiss = () => {
    dismissPresaleEditHint();
    setOpen(false);
  };

  return (
    <div className="presale-edit-mode-banner" role="status">
      <MousePointerClick size={16} strokeWidth={2.25} aria-hidden className="presale-edit-mode-banner__icon" />
      <span>
        문구·이미지를 <strong>클릭</strong>하면 바로 수정할 수 있습니다. 섹션 순서·노출은 왼쪽 패널에서
        조절하세요.
      </span>
      <button type="button" className="presale-edit-mode-banner__dismiss" onClick={handleDismiss}>
        확인
      </button>
      <button
        type="button"
        className="presale-edit-mode-banner__close"
        onClick={handleDismiss}
        aria-label="인라인 편집 안내 닫기"
      >
        <X size={15} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
