"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
} from "react";
import { EditableText } from "@midday/components/EditableText";

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

function findPreviewScrollRoot(el: Element | null): Element | null {
  let node: Element | null = el;
  while (node) {
    if (node instanceof HTMLElement && node.hasAttribute("data-preview-scroll")) return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * 글자 리빌 IO. `active`가 false(편집 모드)일 때는 구독하지 않고,
 * true로 바뀌는 순간(미리보기 전환) ref가 붙은 뒤 다시 관찰한다.
 */
export function useTitleReplay<T extends HTMLElement = HTMLElement>(active = true) {
  const ref = useRef<T>(null);
  const [on, setOn] = useState(false);

  useLayoutEffect(() => {
    if (!active) {
      setOn(false);
      return;
    }

    let io: IntersectionObserver | null = null;
    let fallback = 0;
    let raf = 0;
    let cancelled = false;

    const arm = (el: HTMLElement) => {
      if (cancelled) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setOn(true);
        return;
      }
      const scrollRoot = findPreviewScrollRoot(el);
      const reveal = () => setOn(true);
      const rect = el.getBoundingClientRect();
      const rootRect = scrollRoot?.getBoundingClientRect();
      const topBound = rootRect ? rootRect.top : 0;
      const bottomBound = rootRect ? rootRect.bottom : window.innerHeight;
      const inViewNow = rect.bottom > topBound && rect.top < bottomBound;
      if (inViewNow) reveal();

      io = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            reveal();
            io?.unobserve(el);
          }
        },
        {
          root: scrollRoot,
          threshold: 0.08,
          rootMargin: "0px 0px -6% 0px",
        },
      );
      io.observe(el);
      // 초기 뷰포트에만 안전망 — 아래 섹션은 스크롤 IO로만 리빌
      if (inViewNow) fallback = window.setTimeout(reveal, 400);
    };

    const el = ref.current;
    if (el) {
      arm(el);
    } else {
      // 편집→미리보기 전환 직후 ref attach를 한 프레임 기다린다.
      raf = window.requestAnimationFrame(() => {
        const next = ref.current;
        if (next) arm(next);
      });
    }

    return () => {
      cancelled = true;
      io?.disconnect();
      if (fallback) window.clearTimeout(fallback);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [active]);

  return { ref, on };
}

type MiddayTitleRevealProps = {
  text: string;
  editMode: boolean;
  onChange: (value: string) => void;
  as?: "h1" | "h2" | "h3" | "span";
  className?: string;
};

export function MiddayTitleReveal({
  text,
  editMode,
  onChange,
  as: Tag = "span",
  className,
}: MiddayTitleRevealProps) {
  const { ref, on } = useTitleReplay<HTMLElement>(!editMode);
  const cleaned = text.replace(/\|/g, "");

  if (editMode) {
    const EditTag = Tag as ElementType;
    if (Tag === "span") {
      return (
        <EditableText as="span" className={className} value={text} editMode onChange={onChange} />
      );
    }
    return (
      <EditTag className={className}>
        <EditableText as="span" value={text} editMode onChange={onChange} />
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

export function TitleChars({
  text,
  lineIndex,
  startIndex = 0,
}: {
  text: string;
  lineIndex: number;
  startIndex?: number;
}) {
  return <>{chars(text, lineIndex, startIndex)}</>;
}
