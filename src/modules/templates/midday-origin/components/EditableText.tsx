"use client";

import { useCallback, useEffect, useRef } from "react";

interface EditableTextProps {
  value: string;
  editMode: boolean;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div" | "b" | "small";
  className?: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  /** 편집 힌트 (placeholder 스타일) */
  placeholder?: string;
}

export function EditableText({
  value,
  editMode,
  as: Tag = "span",
  className,
  onChange,
  multiline = true,
  placeholder,
}: EditableTextProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !editMode || document.activeElement === el) return;
    if (el.innerText !== value) el.innerText = value;
  }, [editMode, value]);

  const handleBlur = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const next = el.innerText;
    if (next !== value) onChange(next);
  }, [onChange, value]);

  const handleFocus = useCallback(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        (e.target as HTMLElement).blur();
        return;
      }
      if (!multiline && e.key === "Enter") {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
    },
    [multiline]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  if (!editMode) {
    if (!multiline) {
      return (
        <Tag key="preview" className={className}>
          {value}
        </Tag>
      );
    }
    return (
      <Tag key="preview" className={className}>
        {value.split("\n").map((line, i, arr) => (
          <span key={i}>
            {line}
            {i < arr.length - 1 ? <br /> : null}
          </span>
        ))}
      </Tag>
    );
  }

  return (
    <Tag
      key="edit"
      ref={ref as React.RefObject<never>}
      className={`presale-editable-text ${className ?? ""} ${!value ? "presale-editable-text--empty" : ""}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    />
  );
}
