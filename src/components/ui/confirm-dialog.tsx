"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { orgText } from "@/modules/admin/org-copy";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = orgText("confirmOk"),
  cancelLabel = orgText("confirmCancel"),
  danger,
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    // danger는 취소에 포커스해 Enter 실수 방지
    (danger ? cancelRef : confirmRef).current?.focus();

    function focusables() {
      return [...(panelRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? [])];
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
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

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, danger, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label={cancelLabel} onClick={onCancel} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative z-10 w-full max-w-md space-y-4 ui-card"
      >
        <h2 id={titleId} className="text-xl font-bold">
          {title}
        </h2>
        {description ? (
          <p id={descId} className="text-sm text-text-body">
            {description}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            variant={danger ? "danger" : "primary"}
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
