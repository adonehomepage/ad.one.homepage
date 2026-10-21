"use client";

import { useEffect, useRef, type RefObject } from "react";

/** 다이얼로그 열림 시 초기 포커스·Tab 순환·Esc·닫을 때 포커스 복원. */
export function useDialogFocusTrap({
  open,
  panelRef,
  initialFocusRef,
  onEscape,
  escapeEnabled = true,
}: {
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape: () => void;
  escapeEnabled?: boolean;
}) {
  const onEscapeRef = useRef(onEscape);
  const escapeEnabledRef = useRef(escapeEnabled);
  onEscapeRef.current = onEscape;
  escapeEnabledRef.current = escapeEnabled;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTarget = initialFocusRef?.current ?? panelRef.current?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    const frame = window.requestAnimationFrame(() => focusTarget?.focus());

    function focusables() {
      return [...(panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? [])].filter(
        (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
      );
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && escapeEnabledRef.current) {
        event.preventDefault();
        onEscapeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [open, panelRef, initialFocusRef]);
}
