"use client";

import { cn } from "@/lib/cn";
import type { ReactNode, RefObject } from "react";

export function DialogShell({
  titleId,
  describedBy,
  panelRef,
  onClose,
  closeLabel = "닫기",
  closeDisabled,
  size = "md",
  children,
  className,
}: {
  titleId: string;
  describedBy?: string;
  panelRef?: RefObject<HTMLElement | null>;
  onClose?: () => void;
  closeLabel?: string;
  closeDisabled?: boolean;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-text-primary/45"
        aria-label={closeLabel}
        disabled={closeDisabled}
        onClick={() => {
          if (closeDisabled) return;
          onClose?.();
        }}
      />
      <div
        ref={panelRef as RefObject<HTMLDivElement>}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        className={cn(
          "relative z-10 flex max-h-[min(88vh,720px)] w-full flex-col overflow-hidden rounded-[16px] border border-border bg-white",
          size === "sm" && "max-w-[22rem]",
          size === "md" && "max-w-[28rem]",
          size === "lg" && "max-w-[36rem]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  titleId,
  title,
  onClose,
  closeLabel = "닫기",
  closeDisabled,
}: {
  titleId: string;
  title: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  closeDisabled?: boolean;
}) {
  return (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4">
      <h2 id={titleId} className="text-lg font-bold tracking-tight text-text-primary">
        {title}
      </h2>
      {onClose ? (
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-text-muted hover:bg-surface hover:text-text-primary disabled:opacity-40"
          aria-label={closeLabel}
          disabled={closeDisabled}
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export function DialogBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)}>{children}</div>;
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-surface/80 px-5 py-3", className)}>{children}</div>;
}
