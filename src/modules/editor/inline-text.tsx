"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export function InlineText({
  value,
  onCommit,
  className,
  placeholder,
  multiline,
}: {
  value: string;
  onCommit?: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || focused.current) return;
    if (node.textContent !== value) node.textContent = value;
  }, [value]);

  if (!onCommit) {
    return <span className={cn("whitespace-pre-wrap break-keep", className)}>{value}</span>;
  }

  return (
    <span
      ref={ref}
      role="textbox"
      aria-label={placeholder}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={cn(
        "inline-edit cursor-text whitespace-pre-wrap break-keep rounded-sm outline-none hover:bg-black/5 focus:bg-black/5 focus:ring-2 focus:ring-primary/40",
        className,
      )}
      onFocus={() => {
        focused.current = true;
      }}
      onBlur={(event) => {
        focused.current = false;
        onCommit((event.currentTarget.textContent ?? "").replace(/\u00a0/g, " "));
      }}
      onKeyDown={(event) => {
        if (!multiline && event.key === "Enter") event.preventDefault();
      }}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, multiline ? text : text.replace(/\n/g, " "));
      }}
    />
  );
}
