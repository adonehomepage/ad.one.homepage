"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType } from "react";
import { InlineText } from "@/modules/editor/inline-text";

function chars(text: string, lineIndex: number, startIndex = 0) {
  return Array.from(text).map((ch, i) => (
    <span
      key={`${lineIndex}-${startIndex + i}`}
      className="midday-title-reveal__ch"
      style={
        {
          "--line-i": String(lineIndex),
          "--ch-i": String(startIndex + i),
        } as CSSProperties
      }
    >
      {ch === " " ? "\u00a0" : ch}
    </span>
  ));
}

function useTitleReplay<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  // 편집기 스크롤 컨테이너에서도 글자가 안 뜨지 않도록 기본 표시
  const [on, setOn] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOn(true);
      return;
    }
    const reveal = () => setOn(true);
    const rect = el.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) reveal();
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) reveal();
      },
      { threshold: 0.01, rootMargin: "40px 0px 40px 0px" },
    );
    io.observe(el);
    const fallback = window.setTimeout(reveal, 80);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return { ref, on };
}

type MiddayTitleRevealProps = {
  text: string;
  edit?: boolean;
  onCommit?: (value: string) => void;
  as?: "h1" | "h2" | "h3" | "span";
  className?: string;
  placeholder?: string;
  multiline?: boolean;
};

/** midday(프리미엄 화보형) 섹션 타이틀 글자 리빌. 편집 중에는 InlineText. */
export function MiddayTitleReveal({
  text,
  edit,
  onCommit,
  as: Tag = "span",
  className,
  placeholder,
  multiline,
}: MiddayTitleRevealProps) {
  const { ref, on } = useTitleReplay<HTMLElement>();
  const cleaned = text.replace(/\|/g, "");

  if (edit) {
    const EditTag = Tag as ElementType;
    if (Tag === "span") {
      return <InlineText value={text} className={className} placeholder={placeholder} multiline={multiline} onCommit={onCommit} />;
    }
    return (
      <EditTag className={className}>
        <InlineText value={text} placeholder={placeholder} multiline={multiline} onCommit={onCommit} />
      </EditTag>
    );
  }

  const lines = cleaned.split("\n");
  const RevealTag = Tag as ElementType;

  return (
    <RevealTag
      ref={ref}
      className={`midday-title-reveal${on ? " is-inview" : ""}${className ? ` ${className}` : ""}`}
    >
      {lines.map((line, li) => (
        <span key={li} className="midday-title-reveal__line">
          {chars(line.length ? line : " ", li)}
        </span>
      ))}
    </RevealTag>
  );
}
