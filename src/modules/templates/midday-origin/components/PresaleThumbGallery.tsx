"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus } from "lucide-react";
import type { PresaleImageSlot } from "@midday/types/presale-landing";
import { PRESALE_GALLERY_MAX, presaleGalleryImageLabel } from "@midday/types/presale-landing";
import { EditableImage } from "./EditableImage";

interface PresaleThumbGalleryProps {
  images: PresaleImageSlot[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onImagesChange: (images: PresaleImageSlot[]) => void;
  editMode: boolean;
  /** vertical: 입지조건(메인+우측 세로 스트립) / horizontal: 상품 상단(메인+하단 가로 스트립) */
  layout?: "horizontal" | "vertical";
  mainAspect?: "square" | "4/3" | "contain" | "cover";
  mainClassName?: string;
  showRepresentativeBadge?: boolean;
  caption?: React.ReactNode;
  maxImages?: number;
  /** 슬롯별 label 유지 (프리미엄 갤러리 등) */
  preserveSlotLabels?: boolean;
  galleryClassName?: string;
  onMainPreviewClick?: (url: string, label: string) => void;
}

export function PresaleThumbGallery({
  images,
  activeIndex,
  onActiveIndexChange,
  onImagesChange,
  editMode,
  layout = "horizontal",
  mainAspect = "square",
  mainClassName = "",
  showRepresentativeBadge = false,
  caption,
  maxImages = PRESALE_GALLERY_MAX,
  preserveSlotLabels = false,
  galleryClassName = "",
  onMainPreviewClick,
}: PresaleThumbGalleryProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);
  const [stripOverflow, setStripOverflow] = useState(false);

  const isVertical = layout === "vertical";
  const safeIndex = Math.min(activeIndex, Math.max(0, images.length - 1));
  const activeImage = images[safeIndex] ?? images[0];
  const mainUrl = activeImage?.url ?? "";
  const mainLabel = presaleGalleryImageLabel(safeIndex);

  const emitImages = (next: PresaleImageSlot[]) => {
    onImagesChange(
      next.map((img, i) => ({
        ...img,
        label: preserveSlotLabels
          ? img.label?.trim() || presaleGalleryImageLabel(i)
          : presaleGalleryImageLabel(i),
        ...(typeof img.caption === "string" ? { caption: img.caption } : {}),
      }))
    );
  };

  const updateScrollState = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;

    if (isVertical) {
      const overflow = el.scrollHeight > el.clientHeight + 2;
      setStripOverflow(overflow);
      setCanScrollBack(el.scrollTop > 2);
      setCanScrollForward(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
    } else {
      const overflow = el.scrollWidth > el.clientWidth + 2;
      setStripOverflow(overflow);
      setCanScrollBack(el.scrollLeft > 2);
      setCanScrollForward(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }
  }, [isVertical]);

  useEffect(() => {
    updateScrollState();
  }, [images.length, layout, updateScrollState]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    return () => ro.disconnect();
  }, [layout, images.length, updateScrollState]);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const activeThumb = el.querySelector<HTMLElement>(`[data-thumb-index="${safeIndex}"]`);
    if (!activeThumb) return;

    if (isVertical) {
      const thumbTop = activeThumb.offsetTop;
      const thumbBottom = thumbTop + activeThumb.offsetHeight;
      const viewTop = el.scrollTop;
      const viewBottom = viewTop + el.clientHeight;
      if (thumbTop < viewTop) {
        el.scrollTop = thumbTop;
      } else if (thumbBottom > viewBottom) {
        el.scrollTop = thumbBottom - el.clientHeight;
      }
    } else {
      const thumbLeft = activeThumb.offsetLeft;
      const thumbRight = thumbLeft + activeThumb.offsetWidth;
      const viewLeft = el.scrollLeft;
      const viewRight = viewLeft + el.clientWidth;
      if (thumbLeft < viewLeft) {
        el.scrollLeft = thumbLeft;
      } else if (thumbRight > viewRight) {
        el.scrollLeft = thumbRight - el.clientWidth;
      }
    }
  }, [safeIndex, layout, isVertical]);

  const scrollStrip = (dir: -1 | 1) => {
    const el = stripRef.current;
    if (!el) return;
    if (isVertical) {
      el.scrollBy({ top: dir * 88, behavior: "smooth" });
    } else {
      el.scrollBy({ left: dir * 88, behavior: "smooth" });
    }
    window.setTimeout(updateScrollState, 220);
  };

  const updateImageAt = (index: number, url: string) => {
    const next = [...images];
    next[index] = { ...next[index], url };
    emitImages(next);
  };

  const addImage = () => {
    if (images.length >= maxImages) return;
    emitImages([...images, { url: "", label: presaleGalleryImageLabel(images.length) }]);
    onActiveIndexChange(images.length);
  };

  const removeImage = (index: number) => {
    if (images.length <= 1) return;
    const next = images.filter((_, i) => i !== index);
    let newActive = safeIndex;
    if (index < safeIndex) newActive = safeIndex - 1;
    else if (index === safeIndex) newActive = Math.max(0, safeIndex - 1);
    emitImages(next);
    onActiveIndexChange(newActive);
  };

  const renderThumbCells = () => (
    <>
      {images.map((img, i) => (
        <div key={`thumb-${i}`} className="presale-thumb-cell" data-thumb-index={i}>
          {showRepresentativeBadge && i === 0 ? (
            <span className="presale-thumb-rep">대표</span>
          ) : null}
          <EditableImage
            url={img.url}
            editMode={editMode}
            imageRole="thumb"
            aspect={isVertical ? "4/3" : "square"}
            isSelected={i === safeIndex}
            className={i === safeIndex ? "active" : ""}
            onSelect={() => onActiveIndexChange(i)}
            onChange={(url) => updateImageAt(i, url)}
          />
          {editMode ? (
            <span className={`presale-thumb-caption ${i === safeIndex ? "is-active" : ""}`}>
              {preserveSlotLabels
                ? img.label?.trim() || presaleGalleryImageLabel(i)
                : presaleGalleryImageLabel(i)}
            </span>
          ) : null}
          {editMode && images.length > 1 ? (
            <button
              type="button"
              className="presale-thumb-del"
              aria-label={`${presaleGalleryImageLabel(i)} 삭제`}
              onClick={(e) => {
                e.stopPropagation();
                removeImage(i);
              }}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
    </>
  );

  const addDockButton =
    editMode && images.length < maxImages ? (
      <button
        type="button"
        className={`presale-thumb-add ${isVertical ? "presale-thumb-add--dock" : "presale-thumb-add--dock-horizontal"}`}
        onClick={addImage}
      >
        <Plus size={16} strokeWidth={2.25} aria-hidden />
        <span>추가</span>
      </button>
    ) : null;

  const countBlock =
    editMode && images.length > 0 ? (
      <div
        className={`presale-thumb-count ${isVertical ? "" : "presale-thumb-count--horizontal"}`}
        aria-live="polite"
      >
        {safeIndex + 1} / {images.length}
        <span> · 최대 {maxImages}장</span>
      </div>
    ) : null;

  const thumbStrip = (
    <div
      ref={stripRef}
      className={`presale-thumbs ${isVertical ? "presale-thumbs--vertical" : "presale-thumbs--horizontal"}`}
      onScroll={updateScrollState}
    >
      {renderThumbCells()}
    </div>
  );

  const renderNavButton = (
    direction: "back" | "forward",
    extraClass = ""
  ) => {
    if (!stripOverflow) return null;

    const isBack = direction === "back";
    const disabled = isBack ? !canScrollBack : !canScrollForward;
    const label = isVertical
      ? isBack
        ? "위 썸네일 보기"
        : "아래 썸네일 보기"
      : isBack
        ? "이전 썸네일"
        : "다음 썸네일";

    return (
      <button
        type="button"
        className={`presale-thumb-strip-nav ${extraClass}`.trim()}
        aria-label={label}
        disabled={disabled}
        onClick={() => scrollStrip(isBack ? -1 : 1)}
      >
        {isVertical ? (
          isBack ? (
            <ChevronUp size={16} strokeWidth={2.25} />
          ) : (
            <ChevronDown size={16} strokeWidth={2.25} />
          )
        ) : isBack ? (
          <ChevronLeft size={16} strokeWidth={2.25} />
        ) : (
          <ChevronRight size={16} strokeWidth={2.25} />
        )}
      </button>
    );
  };

  const renderPreviewStripZone = () => (
    <div
      className={`presale-thumb-strip-zone presale-thumb-strip-zone--preview ${
        isVertical ? "presale-thumb-strip-zone--vertical" : "presale-thumb-strip-zone--horizontal"
      }`}
    >
      {renderNavButton(
        "back",
        `presale-thumb-strip-nav--overlay ${isVertical ? "presale-thumb-strip-nav--top" : "presale-thumb-strip-nav--left"}`
      )}
      {thumbStrip}
      {renderNavButton(
        "forward",
        `presale-thumb-strip-nav--overlay ${isVertical ? "presale-thumb-strip-nav--bottom" : "presale-thumb-strip-nav--right"}`
      )}
    </div>
  );

  const renderEditStrip = () => {
    if (isVertical) {
      return (
        <div className="presale-thumb-strip-column">
          {renderNavButton("back")}
          {thumbStrip}
          {renderNavButton("forward")}
          {addDockButton}
        </div>
      );
    }

    return (
      <div className="presale-thumb-strip-row">
        {renderNavButton("back", "presale-thumb-strip-nav--left")}
        {thumbStrip}
        {renderNavButton("forward", "presale-thumb-strip-nav--right")}
        {addDockButton}
      </div>
    );
  };

  const sideClassName = [
    "presale-thumb-gallery-side",
    editMode ? "presale-thumb-gallery-side--panel" : "",
    isVertical ? "presale-thumb-gallery-side--vertical" : "presale-thumb-gallery-side--horizontal",
  ]
    .filter(Boolean)
    .join(" ");

  const showThumbStrip = editMode || images.length > 1;

  const mainFigure = (
    <figure className={`presale-thumb-gallery-main ${caption ? "presale-thumb-gallery-main--caption" : ""}`}>
      <EditableImage
        url={mainUrl}
        label={mainLabel}
        editMode={editMode}
        imageRole="hero"
        aspect={mainAspect}
        reserveCaptionBand={Boolean(caption)}
        className={`presale-thumb-gallery-hero ${mainClassName}`.trim()}
        onChange={(url) => updateImageAt(safeIndex, url)}
        onPreviewClick={
          !editMode && onMainPreviewClick && mainUrl?.trim()
            ? () => onMainPreviewClick(mainUrl, mainLabel)
            : undefined
        }
      />
      {caption ? (
        <figcaption
          className="presale-iv-cap"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );

  return (
    <div
      className={`presale-thumb-gallery presale-thumb-gallery--${isVertical ? "vertical" : "horizontal"} ${
        !isVertical ? "presale-gallery" : ""
      } ${editMode ? "presale-thumb-gallery--edit" : ""} ${galleryClassName}`.trim()}
    >
      {mainFigure}

      {showThumbStrip ? (
        <div className={sideClassName}>
          {editMode ? renderEditStrip() : renderPreviewStripZone()}
          {countBlock}
        </div>
      ) : null}
    </div>
  );
}
