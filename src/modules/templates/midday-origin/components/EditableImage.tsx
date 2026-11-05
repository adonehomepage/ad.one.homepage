"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw } from "lucide-react";
import { uploadLandingImageViaApi } from "@midday/lib/landing-builder-browser-upload";
import { usePresaleImageUpload } from "./PresaleImageUploadContext";

interface EditableImageProps {
  url: string;
  label?: string;
  editMode: boolean;
  className?: string;
  placeholderClassName?: string;
  fallbackText?: string;
  onChange: (url: string) => void;
  aspect?: "square" | "4/3" | "contain" | "cover";
  variant?: "default" | "avatar";
  uploadViaButton?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
  /** hero: 대표 메인 / thumb: 썸네일 / panel: 평면·입지 등 / logo: GNB 로고 / default */
  imageRole?: "hero" | "thumb" | "panel" | "logo" | "default";
  /** 편집 오버레이·빈 슬롯에 표시할 권장 사이즈 안내 */
  sizeHint?: string;
  /** 메인 하단 캡션 영역 클릭을 이미지 변경과 분리 */
  reserveCaptionBand?: boolean;
  /** 캡션 밴드 높이(px). reserveCaptionBand일 때 하단 이 영역 클릭은 이미지 변경 무시 */
  captionBandPx?: number;
  /** 미리보기에서 클릭 시 확대 보기 */
  onPreviewClick?: () => void;
}

export function EditableImage({
  url,
  label,
  editMode,
  className = "",
  placeholderClassName = "",
  fallbackText,
  onChange,
  aspect = "square",
  variant = "default",
  uploadViaButton = false,
  onSelect,
  isSelected = false,
  imageRole = "default",
  reserveCaptionBand = false,
  captionBandPx = 56,
  sizeHint,
  onPreviewClick,
}: EditableImageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadCtx = usePresaleImageUpload();
  const [uploading, setUploading] = useState(false);
  const hasImage = Boolean(url?.trim());

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const useHeroChrome = editMode && imageRole === "hero";
  const useThumbChrome = editMode && imageRole === "thumb";
  const usePanelChrome = editMode && imageRole === "panel";
  const useLogoChrome = editMode && imageRole === "logo";
  const useAvatarChrome = editMode && variant === "avatar";
  const useDefaultChrome =
    editMode && imageRole === "default" && !uploadViaButton && variant !== "avatar";

  const isCaptionBandClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (!reserveCaptionBand || !editMode) return false;
      const rect = e.currentTarget.getBoundingClientRect();
      return e.clientY >= rect.bottom - captionBandPx;
    },
    [reserveCaptionBand, editMode, captionBandPx]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (isCaptionBandClick(e)) return;
      if (imageRole === "thumb" && onSelect) {
        e.stopPropagation();
        onSelect();
        return;
      }
      if (!editMode) {
        if (onPreviewClick && hasImage) {
          e.stopPropagation();
          onPreviewClick();
        }
        return;
      }
      if (variant === "avatar") {
        e.stopPropagation();
        openPicker();
        return;
      }
      if (uploadViaButton || useThumbChrome) {
        e.stopPropagation();
        onSelect?.();
        return;
      }
      if (useHeroChrome || usePanelChrome || useDefaultChrome || useLogoChrome) {
        openPicker();
      }
    },
    [editMode, variant, imageRole, onSelect, uploadViaButton, useThumbChrome, useHeroChrome, usePanelChrome, useDefaultChrome, useLogoChrome, openPicker, isCaptionBandClick, onPreviewClick, hasImage]
  );

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      const previousUrl = url;
      const objectUrl = URL.createObjectURL(file);
      onChange(objectUrl);
      if (!uploadCtx) return;

      void (async () => {
        uploadCtx.beginUpload();
        setUploading(true);
        try {
          const uploaded = await uploadLandingImageViaApi(file, {
            filename: file.name || "landing-image.jpg",
            projectId: uploadCtx.projectId ?? undefined,
          });
          onChange(uploaded.url);
          URL.revokeObjectURL(objectUrl);
        } catch (err) {
          onChange(previousUrl);
          URL.revokeObjectURL(objectUrl);
          const msg =
            err instanceof Error ? err.message : "이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.";
          uploadCtx.onUploadError?.(msg);
        } finally {
          setUploading(false);
          uploadCtx.endUpload();
        }
      })();
    },
    [onChange, uploadCtx, url]
  );

  const aspectClass =
    aspect === "4/3"
      ? "presale-shot--43"
      : aspect === "contain"
        ? "presale-shot--contain"
        : aspect === "cover"
          ? "presale-shot--cover"
          : "";

  const roleClass =
    imageRole === "hero"
      ? "presale-editable-image--hero"
      : imageRole === "thumb"
        ? "presale-editable-image--thumb"
        : imageRole === "panel"
          ? "presale-editable-image--panel"
          : imageRole === "logo"
            ? "presale-editable-image--logo"
            : "";

  const baseClass =
    variant === "avatar"
      ? `presale-editable-image presale-editable-image--avatar presale-avatar-image ${className}`
      : `presale-shot presale-editable-image ${uploadViaButton || useThumbChrome ? "presale-editable-image--btn-only" : ""} ${roleClass} ${reserveCaptionBand ? "presale-editable-image--caption-band" : ""} ${aspectClass} ${className}`;

  const selectedClass = isSelected ? "presale-shot--selected" : "";
  const emptyEditClass = editMode && !hasImage ? "presale-shot--empty-edit" : "";

  const overlayLabel = hasImage ? "이미지 변경" : "이미지 추가";
  const OverlayIcon = hasImage ? Camera : ImagePlus;

  return (
    <figure
      className={`${baseClass} ${hasImage ? "presale-shot--has-image" : "presale-shot--ph"} ${placeholderClassName} ${selectedClass} ${emptyEditClass} ${!editMode && onPreviewClick && hasImage ? "presale-shot--preview-zoom" : ""}`}
      style={hasImage ? { backgroundImage: `url(${url})` } : undefined}
      data-label={label ?? "이미지"}
      aria-label={editMode ? overlayLabel : label ?? "이미지"}
      onClick={handleClick}
      role={editMode || onPreviewClick ? "button" : undefined}
      tabIndex={editMode || onPreviewClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (!editMode && onPreviewClick && hasImage && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onPreviewClick();
          return;
        }
        if (editMode && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          if (uploadViaButton || useThumbChrome) onSelect?.();
          else openPicker();
        }
      }}
    >
      {!hasImage && fallbackText && !editMode ? (
        <span className="presale-shot-initial">{fallbackText.slice(0, 1)}</span>
      ) : null}

      {editMode && !hasImage && variant === "avatar" ? (
        <span className="presale-avatar-empty-hint" aria-hidden>
          <ImagePlus size={20} strokeWidth={1.75} />
          <span>사진 추가</span>
        </span>
      ) : null}

      {editMode && !hasImage && variant !== "avatar" && imageRole !== "thumb" && imageRole !== "logo" ? (
        <span className="presale-img-empty-hint" aria-hidden>
          <span className="presale-img-empty-icon">
            <ImagePlus size={22} strokeWidth={1.75} />
          </span>
          {/* 딤 처리 + 아이콘만 — "이미지 추가" 문구는 중복이라 생략 */}
          {sizeHint ? <span className="presale-img-empty-sub">{sizeHint}</span> : null}
        </span>
      ) : null}

      {editMode && !hasImage && imageRole === "thumb" ? (
        <span className="presale-thumb-empty-mark" aria-hidden>
          <ImagePlus size={18} strokeWidth={1.75} />
        </span>
      ) : null}

      {useAvatarChrome && hasImage ? (
        <button
          type="button"
          className="presale-img-edit-overlay presale-img-edit-overlay--avatar"
          aria-label="상담사 사진 변경"
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
        >
          <span className="presale-img-edit-icon presale-img-edit-icon--avatar" aria-hidden>
            <Camera size={16} strokeWidth={1.75} />
          </span>
          <span>사진 변경</span>
        </button>
      ) : null}

      {useLogoChrome ? (
        <span className="presale-logo-slot-icon" aria-hidden>
          <ImagePlus size={14} strokeWidth={1.75} />
          <span className="presale-logo-slot-label">교체</span>
        </span>
      ) : null}

      {hasImage && (useHeroChrome || usePanelChrome || useDefaultChrome) ? (
        <button
          type="button"
          className={`presale-img-edit-overlay ${useHeroChrome ? "presale-img-edit-overlay--hero" : ""}`}
          aria-label={overlayLabel}
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
        >
          <span className="presale-img-edit-icon" aria-hidden>
            <OverlayIcon size={useHeroChrome ? 20 : 18} strokeWidth={1.75} />
          </span>
          <span>{overlayLabel}</span>
          {sizeHint ? <span className="presale-img-size-hint">{sizeHint}</span> : null}
        </button>
      ) : null}

      {useThumbChrome && (hasImage || isSelected) ? (
        <button
          type="button"
          className="presale-img-thumb-btn"
          aria-label="썸네일 이미지 변경"
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
        >
          <RefreshCw size={13} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}

      {editMode && uploadViaButton && !useThumbChrome ? (
        <button
          type="button"
          className="presale-img-replace-btn"
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
        >
          <RefreshCw size={12} strokeWidth={2.25} aria-hidden />
          <span>교체</span>
        </button>
      ) : null}

      {uploading ? (
        <span className="presale-img-uploading" aria-live="polite">
          업로드 중…
        </span>
      ) : null}

      {editMode ? (
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      ) : null}
    </figure>
  );
}
