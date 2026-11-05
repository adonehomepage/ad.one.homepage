"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ImagePlus, Plus, Trash2, X } from "lucide-react";
import type { PresalePopupData } from "@midday/types/presale-landing";

interface PresaleEventPopupProps {
  title: string;
  description: string;
  ctaLabel?: string;
  imageUrl?: string;
  perks?: string[];
  disclaimer?: string;
  phone?: string;
  onRegister: () => void;
  onClose: (hideToday: boolean) => void;
  /** 편집기 미리보기 — 설정 모달로 돌아가기 */
  onBackToSettings?: () => void;
  /** 편집기 미리보기 화면(태블릿·모바일) 크기 시뮬레이션 */
  viewportDevice?: "tablet" | "mobile";
}

export function PresaleEventPopup({
  title,
  description,
  ctaLabel = "관심고객 등록하기",
  imageUrl,
  perks = [],
  disclaimer,
  phone,
  onRegister,
  onClose,
  onBackToSettings,
  viewportDevice,
}: PresaleEventPopupProps) {
  const [hideToday, setHideToday] = useState(false);
  const lines = title.split("\n");
  const hasImage = Boolean(imageUrl?.trim());
  const visiblePerks = perks.map((item) => item.trim()).filter(Boolean);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(hideToday);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [hideToday, onClose]);

  const handleClose = () => onClose(hideToday);

  const overlayClass = [
    "presale-modal-overlay",
    viewportDevice ? `presale-modal-overlay--${viewportDevice}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={overlayClass} onClick={handleClose} role="presentation">
      <div className="presale-event-popup-stack">
        {onBackToSettings ? (
          <button
            type="button"
            className="presale-event-popup-back"
            onClick={(e) => {
              e.stopPropagation();
              onBackToSettings();
            }}
          >
            <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
            설정으로 돌아가기
          </button>
        ) : null}
        <div
          className="presale-event-popup-card"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="presale-event-popup-title"
        >
        <div className="presale-event-popup-hero">
          <button
            type="button"
            className="presale-event-popup-close"
            onClick={handleClose}
            aria-label="닫기"
          >
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
          {hasImage ? (
            <div className="presale-event-popup-image">
              <img src={imageUrl} alt="" />
            </div>
          ) : (
            <div className="presale-event-popup-image presale-event-popup-image--empty" aria-hidden />
          )}
        </div>

        <div className="presale-event-popup-body">
          <h3 id="presale-event-popup-title" className="presale-event-popup-title">
            {lines.map((line, i) => (
              <span key={i}>
                {renderGoldMarkers(line)}
                {i < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </h3>
          <p className="presale-event-popup-desc">{description}</p>

          {visiblePerks.length > 0 ? (
            <ul className="presale-event-popup-perks">
              {visiblePerks.map((item) => (
                <li key={item}>
                  <span className="presale-event-popup-perk-icon" aria-hidden>
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {disclaimer ? <p className="presale-event-popup-note">{disclaimer}</p> : null}

          <button
            type="button"
            className="presale-event-popup-cta"
            onClick={() => {
              onClose(hideToday);
              onRegister();
            }}
          >
            {ctaLabel}
          </button>

          {phone ? (
            <p className="presale-event-popup-phone">
              <span>바로 상담</span>
              <b>{phone}</b>
            </p>
          ) : null}
        </div>

        <div className="presale-event-popup-footer">
          <label className="presale-event-popup-dismiss">
            <input
              type="checkbox"
              checked={hideToday}
              onChange={(e) => setHideToday(e.target.checked)}
            />
            <span>오늘 하루 보지 않기</span>
          </label>
          <button type="button" className="presale-event-popup-footer-close" onClick={handleClose}>
            닫기
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

function PresalePopupImageField({
  imageUrl,
  onChange,
}: {
  imageUrl: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasImage = Boolean(imageUrl?.trim());

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange(URL.createObjectURL(file));
    e.target.value = "";
  };

  return (
    <div className="presale-side-field presale-side-popup-image">
      <span>팝업 이미지 · 정사각형 권장</span>
      <div className={`presale-side-img-slot presale-side-img-slot--square ${hasImage ? "presale-side-img-slot--has" : ""}`}>
        {hasImage ? (
          <img src={imageUrl} alt="" className="presale-side-img-preview" />
        ) : (
          <div className="presale-side-img-empty">
            <ImagePlus size={18} strokeWidth={1.75} aria-hidden />
            <span>선택 안 함</span>
          </div>
        )}
        <div className="presale-side-img-actions">
          <button type="button" onClick={() => inputRef.current?.click()}>
            {hasImage ? "변경" : "추가"}
          </button>
          {hasImage ? (
            <button type="button" className="presale-side-img-remove" onClick={() => onChange("")}>
              <Trash2 size={13} aria-hidden />
              삭제
            </button>
          ) : null}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
    </div>
  );
}

interface PresalePopupSettingsModalProps {
  open: boolean;
  popup: PresalePopupData;
  onChange: (popup: PresalePopupData) => void;
  onClose: () => void;
  onPreview: (options?: { returnToSettings?: boolean }) => void;
}

export function PresalePopupSettingsModal({
  open,
  popup,
  onChange,
  onClose,
  onPreview,
}: PresalePopupSettingsModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const updatePerk = (index: number, value: string) => {
    const perks = [...popup.perks];
    perks[index] = value;
    onChange({ ...popup, perks });
  };

  const removePerk = (index: number) => {
    if (popup.perks.length <= 1) return;
    onChange({ ...popup, perks: popup.perks.filter((_, i) => i !== index) });
  };

  const addPerk = () => {
    if (popup.perks.length >= 3) return;
    onChange({ ...popup, perks: [...popup.perks, ""] });
  };

  return (
    <div className="presale-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="presale-popup-settings-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="presale-popup-settings-title"
      >
        <button
          ref={closeRef}
          type="button"
          className="presale-popup-settings-close"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={18} strokeWidth={2.25} aria-hidden />
        </button>

        <div className="presale-popup-settings-head">
          <h3 id="presale-popup-settings-title">이벤트 팝업 설정</h3>
          <p>방문 시 자동 노출되는 프로모션 내용을 편집합니다.</p>
        </div>

        <PresalePopupImageField
          imageUrl={popup.imageUrl}
          onChange={(imageUrl) => onChange({ ...popup, imageUrl })}
        />

        <label className="presale-side-field">
          <span>제목 · |금색| 강조 · 줄바꿈 가능</span>
          <textarea
            rows={3}
            value={popup.title}
            onChange={(e) => onChange({ ...popup, title: e.target.value })}
          />
        </label>

        <label className="presale-side-field">
          <span>설명</span>
          <textarea
            rows={2}
            value={popup.description}
            onChange={(e) => onChange({ ...popup, description: e.target.value })}
          />
        </label>

        <div className="presale-side-field">
          <span>혜택 목록</span>
          <div className="presale-popup-perk-list">
            {popup.perks.map((perk, index) => (
              <div key={`perk-${index}`} className="presale-popup-perk-row">
                <input
                  type="text"
                  value={perk}
                  placeholder={`혜택 ${index + 1}`}
                  onChange={(e) => updatePerk(index, e.target.value)}
                />
                {popup.perks.length > 1 ? (
                  <button
                    type="button"
                    className="presale-popup-perk-remove"
                    onClick={() => removePerk(index)}
                    aria-label={`혜택 ${index + 1} 삭제`}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                ) : null}
              </div>
            ))}
            {popup.perks.length < 3 ? (
              <button type="button" className="presale-popup-perk-add" onClick={addPerk}>
                <Plus size={14} aria-hidden />
                혜택 추가
              </button>
            ) : null}
          </div>
        </div>

        <label className="presale-side-field">
          <span>안내 문구</span>
          <input
            type="text"
            value={popup.disclaimer}
            onChange={(e) => onChange({ ...popup, disclaimer: e.target.value })}
          />
        </label>

        <label className="presale-side-field">
          <span>버튼 문구</span>
          <input
            type="text"
            value={popup.ctaLabel}
            onChange={(e) => onChange({ ...popup, ctaLabel: e.target.value })}
          />
        </label>

        <label className="presale-side-field">
          <span>상담 전화번호</span>
          <input
            type="text"
            value={popup.phone}
            onChange={(e) => onChange({ ...popup, phone: e.target.value })}
          />
        </label>

        <label className="presale-side-check">
          <input
            type="checkbox"
            checked={popup.enabled}
            onChange={(e) => onChange({ ...popup, enabled: e.target.checked })}
          />
          <span>방문 시 자동 노출</span>
        </label>

        <button
          type="button"
          className="presale-side-popup-preview"
          onClick={() => {
            onPreview({ returnToSettings: true });
            onClose();
          }}
        >
          팝업 미리보기
        </button>
      </div>
    </div>
  );
}

function renderGoldMarkerLine(text: string, lineKey: string) {
  const parts = text.split(/(\|[^|]+\|)/g);
  return parts.map((part, i) => {
    if (part.startsWith("|") && part.endsWith("|")) {
      return (
        <span key={`${lineKey}-${i}`} className="presale-g">
          {part.slice(1, -1)}
        </span>
      );
    }
    return <span key={`${lineKey}-${i}`}>{part}</span>;
  });
}

/** |금색 강조| 마커 파싱 — 편집 시에는 마커 포함 문자열 그대로 */
export function renderGoldMarkers(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  return lines.map((line, li) => (
    <span key={`line-${li}`} className="presale-gold-line">
      {renderGoldMarkerLine(line, `line-${li}`)}
    </span>
  ));
}

/** **강조** 마커 파싱 */
export function renderBoldMarkers(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
