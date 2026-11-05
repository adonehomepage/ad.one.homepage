"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { uploadLandingImageViaApi } from "@midday/lib/landing-builder-browser-upload";
import { usePresaleImageUpload } from "@midday/components/PresaleImageUploadContext";

export function OakText({
  value,
  editMode,
  onChange,
  as: Tag = "span",
  className,
  multiline = true,
  style,
  placeholder,
}: {
  value: string;
  editMode: boolean;
  onChange: (v: string) => void;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div" | "strong" | "b" | "dt" | "dd" | "small";
  className?: string;
  multiline?: boolean;
  style?: CSSProperties;
  placeholder?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !editMode || document.activeElement === el) return;
    if (el.innerText !== value) el.innerText = value;
  }, [editMode, value]);

  const onBlur = useCallback(() => {
    const next = ref.current?.innerText ?? "";
    if (next !== value) onChange(next);
  }, [onChange, value]);

  if (!editMode) {
    if (!multiline) {
      return (
        <Tag key="view" className={className} style={style}>
          {value}
        </Tag>
      );
    }
    return (
      <Tag key="view" className={className} style={style}>
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
      ref={ref as never}
      className={`oak-editable ${className ?? ""}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLElement).blur();
        }
      }}
    />
  );
}

function readImageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("IMAGE_READ"));
    };
    image.src = objectUrl;
  });
}

export function OakImage({
  url,
  alt,
  editMode,
  onChange,
  className,
  objectPosition,
  exactPixels,
  chrome,
}: {
  url: string;
  alt: string;
  editMode: boolean;
  onChange: (url: string) => void;
  className?: string;
  objectPosition?: string;
  /** 지정 시 업로드 이미지가 해당 픽셀 정사각이어야 한다 (로고 50). */
  exactPixels?: number;
  /** hover면 갤러리 사진 위에 올렸을 때만 변경 버튼을 보여 준다. */
  chrome?: "hover";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadCtx = usePresaleImageUpload();
  const [uploading, setUploading] = useState(false);
  const [sizeHint, setSizeHint] = useState("");
  /** 편집 pill만 마운트 후 표시 — SSR/CSR img는 동일하게 유지 */
  const [editReady, setEditReady] = useState(false);
  useEffect(() => {
    setEditReady(true);
  }, []);

  const hasUrl = Boolean(url?.trim());
  const showEditUi = editMode && editReady;
  const hoverChrome = chrome === "hover";

  return (
    <span
      className={`oak-image-wrap ${className ?? ""}`}
      style={{ position: "relative", display: "block", width: "100%", height: "100%" }}
      onClick={(e) => {
        if (showEditUi) e.stopPropagation();
      }}
    >
      {hasUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} style={objectPosition ? { objectPosition } : undefined} />
      ) : (
        <span
          className="oak-image-empty"
          aria-hidden
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            minHeight: 120,
            border: "1px dashed var(--ink, #403a34)",
            opacity: 0.35,
          }}
        />
      )}
      {showEditUi ? (
        <>
          <button
            type="button"
            className={hoverChrome ? "pill oak-image-hover" : "pill"}
            style={
              hoverChrome
                ? undefined
                : { position: "absolute", right: 12, top: 12, zIndex: 2, background: "var(--paper)" }
            }
            disabled={uploading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {uploading ? "업로드 중…" : hasUrl ? "이미지 변경" : "이미지 업로드"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (exactPixels) {
                const size = await readImageSize(file).catch(() => null);
                if (!size) {
                  setSizeHint("이미지를 읽지 못했습니다.");
                  return;
                }
                if (size.width !== exactPixels || size.height !== exactPixels) {
                  setSizeHint(`${exactPixels}×${exactPixels} 사이즈 이미지를 사용해 주세요.`);
                  return;
                }
              }
              setSizeHint("");
              if (!uploadCtx?.projectId) {
                onChange(URL.createObjectURL(file));
                return;
              }
              setUploading(true);
              uploadCtx.beginUpload();
              try {
                const uploaded = await uploadLandingImageViaApi(file, {
                  projectId: uploadCtx.projectId,
                });
                onChange(uploaded.url);
              } catch (err) {
                uploadCtx.onUploadError?.(err instanceof Error ? err.message : "업로드 실패");
              } finally {
                uploadCtx.endUpload();
                setUploading(false);
              }
            }}
          />
          {sizeHint ? (
            <span
              role="status"
              style={{
                position: "absolute",
                left: "50%",
                top: "calc(100% + 8px)",
                zIndex: 3,
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                borderRadius: 8,
                background: "var(--ink, #191f28)",
                color: "#fff",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {sizeHint}
            </span>
          ) : null}
        </>
      ) : null}
    </span>
  );
}
