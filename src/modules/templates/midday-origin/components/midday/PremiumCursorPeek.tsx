"use client";

import { useEffect, useRef, useState } from "react";

type PremiumCursorPeekProps = {
  src: string;
  active: boolean;
};

export function PremiumCursorPeek({ src, active }: PremiumCursorPeekProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const current = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const readyRef = useRef(false);
  const raf = useRef(0);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!active) {
      readyRef.current = false;
      setOn(false);
      cancelAnimationFrame(raf.current);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const apply = (x: number, y: number) => {
      const node = elRef.current;
      if (node) node.style.transform = `translate3d(${x + 20}px, ${y + 16}px, 0)`;
    };
    const onMove = (e: PointerEvent) => {
      target.current = { x: e.clientX, y: e.clientY };
      if (!readyRef.current) {
        readyRef.current = true;
        current.current = { x: e.clientX, y: e.clientY };
        apply(e.clientX, e.clientY);
        setOn(true);
      }
    };
    const tick = () => {
      const t = target.current;
      const p = current.current;
      const ease = reduce ? 1 : 0.18;
      current.current = {
        x: p.x + (t.x - p.x) * ease,
        y: p.y + (t.y - p.y) * ease,
      };
      apply(current.current.x, current.current.y);
      raf.current = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, [active]);

  if (!src) return null;

  return (
    <div
      ref={elRef}
      className={`premium-cursor-peek${active && on ? " is-on" : ""}`}
      aria-hidden
    >
      <img src={src} alt="" />
    </div>
  );
}
