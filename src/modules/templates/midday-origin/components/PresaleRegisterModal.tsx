"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { PresaleContactForm } from "./PresaleContactForm";

interface PresaleRegisterModalProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  demoMode?: boolean;
  interestTypeOptions?: { label: string }[];
  privacyContactName?: string;
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(nodes).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

export function PresaleRegisterModal({
  open,
  onClose,
  projectId,
  demoMode = false,
  interestTypeOptions = [],
  privacyContactName,
}: PresaleRegisterModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 열릴 때 한 번만 첫 입력칸으로 — onClose 재생성으로 입력 중 포커스 뺏기지 않게
    const t = window.setTimeout(() => {
      firstFieldRef.current?.focus({ preventScroll: true });
    }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusable = getFocusable(sheetRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="presale-rm-overlay" onClick={onClose} role="presentation">
      <div
        ref={sheetRef}
        className="presale-rm-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="presale-rm-title"
      >
        <div className="presale-rm-header">
          <p className="presale-rm-header__eyebrow">관심고객 등록</p>
          <h2 id="presale-rm-title" className="presale-rm-header__title">
            분양 소식을 가장 먼저 받아보세요
          </h2>
          <p className="presale-rm-header__desc">
            {demoMode
              ? "미리보기 모드입니다. 등록 완료 화면을 확인할 수 있습니다."
              : "성함과 연락처만 남겨주시면 담당자가 빠르게 안내드립니다."}
          </p>
        </div>

        <div className="presale-rm-body">
          <PresaleContactForm
            projectId={projectId}
            demoMode={demoMode}
            inModal
            onCloseAfterSuccess={onClose}
            interestTypeOptions={interestTypeOptions}
            privacyContactName={privacyContactName}
            firstFieldRef={firstFieldRef}
          />
        </div>

        <button
          type="button"
          className="presale-rm-header__close"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
