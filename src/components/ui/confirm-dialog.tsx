"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter, DialogHeader, DialogShell } from "@/components/ui/dialog-shell";
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
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
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

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [open, danger, onCancel]);

  if (!open) return null;

  return (
    <DialogShell titleId={titleId} describedBy={description ? descId : undefined} panelRef={panelRef} onClose={onCancel} closeLabel={cancelLabel} size="sm">
      <DialogHeader titleId={titleId} title={title} onClose={onCancel} closeLabel={cancelLabel} />
      {description ? (
        <DialogBody>
          <p id={descId} className="text-sm leading-relaxed text-text-body">
            {description}
          </p>
        </DialogBody>
      ) : (
        <div className="h-2" />
      )}
      <DialogFooter>
        <Button ref={cancelRef} type="button" variant="ghost" className="h-11 px-4 text-[15px]" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button ref={confirmRef} type="button" variant={danger ? "danger" : "primary"} className="h-11 px-4 text-[15px]" loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogShell>
  );
}
