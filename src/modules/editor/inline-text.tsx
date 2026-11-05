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
      aria-multiline={multiline || undefined}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className={cn(
        "inline-edit cursor-text whitespace-pre-wrap break-keep rounded-sm outline-none ring-0 hover:bg-black/5 focus:bg-black/5 focus:ring-0",
        className,
      )}
      onFocus={(event) => {
        focused.current = true;
        // 포커스가 가장자리에 걸려 잘리지 않도록 필요한 만큼만 스크롤한다.
        const node = event.currentTarget;
        window.requestAnimationFrame(() => {
          if (document.activeElement === node) node.scrollIntoView({ block: "nearest", inline: "nearest" });
        });
      }}
      onBlur={(event) => {
        focused.current = false;
        let text = event.currentTarget.innerText.replace(/\u00a0/g, " ");
        // 한 줄 입력칸 끝에 브라우저가 붙이는 줄바꿈은 버린다. 값 중간의 줄바꿈(두 줄 제목)은 그대로 둔다.
        if (!multiline) text = text.replace(/\n+$/, "");
        onCommit(text);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.blur();
          return;
        }
        if (!multiline && event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, multiline ? text : text.replace(/\n/g, " "));
      }}
    />
  );
}

/**
 * 공개 화면용 강조 표기.
 * `**굵게**` 는 굵은 글씨, `|강조|` 는 포인트 색 글씨로 보인다. 줄바꿈(\n)은 그대로 줄이 바뀐다.
 */
export function MarkedText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\|[^|\n]+\|)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="whitespace-pre-line">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("|") && part.endsWith("|") && part.length > 2) {
      return (
        <span key={index} className="whitespace-pre-line font-semibold text-primary">
          {part.slice(1, -1)}
        </span>
      );
    }
    return (
      <span key={index} className="whitespace-pre-line">
        {part}
      </span>
    );
  });
}
