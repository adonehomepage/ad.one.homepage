"use client";

import { useLayoutEffect, useRef, type ReactNode, type RefObject } from "react";

type PresaleGlassTrustTagProps = {
  /** 히어로 섹션 (위치·크기 기준) */
  heroRef: RefObject<HTMLElement | null>;
  /** 실제 배경 이미지 요소 (.presale-shot 등) — 있으면 배경 정렬을 여기에 맞춤 */
  mediaRef?: RefObject<HTMLElement | null>;
  imageUrl?: string;
  className?: string;
  children: ReactNode;
};

/** backdrop-filter 가 조상 overflow 에 막힐 때, 히어로 이미지를 복제해 filter:blur 글래스를 만든다 */
export function PresaleGlassTrustTag({
  heroRef,
  mediaRef,
  imageUrl,
  className = "",
  children,
}: PresaleGlassTrustTagProps) {
  const tagRef = useRef<HTMLSpanElement>(null);
  const glassRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    const mediaHost = mediaRef?.current;
    const media =
      mediaHost?.querySelector<HTMLElement>(".presale-shot") ??
      mediaHost ??
      hero;
    const tag = tagRef.current;
    const glass = glassRef.current;
    if (!hero || !media || !tag || !glass) return;

    const sync = () => {
      const mediaRect = media.getBoundingClientRect();
      const tagRect = tag.getBoundingClientRect();
      const mediaStyle = getComputedStyle(media);

      glass.style.left = `${mediaRect.left - tagRect.left}px`;
      glass.style.top = `${mediaRect.top - tagRect.top}px`;
      glass.style.width = `${mediaRect.width}px`;
      glass.style.height = `${mediaRect.height}px`;

      const bgImage = mediaStyle.backgroundImage;
      if (!imageUrl && bgImage && bgImage !== "none") {
        glass.style.backgroundImage = bgImage;
        glass.style.backgroundSize = mediaStyle.backgroundSize;
        glass.style.backgroundPosition = mediaStyle.backgroundPosition;
        glass.style.backgroundRepeat = mediaStyle.backgroundRepeat;
      } else {
        glass.style.backgroundImage = "";
      }
    };

    sync();

    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(hero);
    resizeObserver.observe(media);
    resizeObserver.observe(tag);

    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, { passive: true });
    document.addEventListener("scroll", sync, { passive: true, capture: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync);
      document.removeEventListener("scroll", sync, true);
    };
  }, [heroRef, mediaRef, imageUrl]);

  return (
    <span ref={tagRef} className={`presale-glass-trust-tag ${className}`.trim()}>
      <span ref={glassRef} className="presale-glass-trust-tag__glass" aria-hidden>
        {imageUrl ? (
          <img
            className="presale-glass-trust-tag__glass-img"
            src={imageUrl}
            alt=""
            draggable={false}
            aria-hidden
          />
        ) : null}
      </span>
      <span className="presale-glass-trust-tag__frost" aria-hidden />
      <span className="presale-glass-trust-tag__shine" aria-hidden />
      {children}
    </span>
  );
}
