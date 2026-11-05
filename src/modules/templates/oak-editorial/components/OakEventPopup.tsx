"use client";

import { useCallback, useEffect, useState } from "react";
import { isPopupEnabled, POPUP_PERK_MAX } from "@/modules/templates/definitions";
import "../styles/oak-editorial.css";

const OPEN_DELAY_MS = 600;

type OakPopupCopy = {
  enabled?: boolean;
  banner?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  perks?: string[];
  disclaimer?: string;
  phone?: string;
  phonePrefix?: string;
  hideTodayLabel?: string;
  closeLabel?: string;
  emptyImageLabel?: string;
};

function hiddenToday(slug: string) {
  const raw = window.localStorage.getItem(`adone-popup-day-${slug}`);
  if (!raw) return false;
  return Number(raw) > Date.now();
}

function hideForToday(slug: string) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  window.localStorage.setItem(`adone-popup-day-${slug}`, String(end.getTime()));
}

function marked(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\|[^|\n]+\|)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("|") && part.endsWith("|") && part.length > 2) {
      return (
        <em key={index} className="oak-popup-mark">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function phoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export function OakEventPopup({
  popup,
  slug,
  phoneFallback,
  editMode,
  forced = false,
  live = false,
  onClose,
  onReturnToSettings,
}: {
  popup: OakPopupCopy;
  slug: string;
  phoneFallback?: string;
  editMode: boolean;
  forced?: boolean;
  live?: boolean;
  onClose?: () => void;
  onReturnToSettings?: () => void;
}) {
  const enabled = isPopupEnabled(popup);
  const [open, setOpen] = useState(forced);
  const [hideToday, setHideToday] = useState(false);
  const perks = (popup.perks ?? []).slice(0, POPUP_PERK_MAX).map((item) => item.trim()).filter(Boolean);
  const phone = (popup.phone || phoneFallback || "").trim();
  const title = popup.title?.trim() || "관심고객으로 등록해 주세요";
  const cta = popup.ctaLabel?.trim() || "관심고객 등록";
  const closeLabel = popup.closeLabel?.trim() || "닫기";

  useEffect(() => {
    if (forced) {
      setOpen(true);
      return;
    }
    if (editMode || !enabled) {
      setOpen(false);
      return;
    }
    if (slug && hiddenToday(slug)) return;
    const timer = window.setTimeout(() => setOpen(true), OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [forced, editMode, enabled, slug]);

  const close = useCallback(() => {
    if (!forced && hideToday && slug) hideForToday(slug);
    setOpen(false);
    onClose?.();
  }, [forced, hideToday, slug, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open) return null;

  function register() {
    close();
    window.setTimeout(() => {
      document.querySelector("[data-section='register']")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  const href = live ? phoneHref(phone) : "";

  return (
    <div className="oak-popup" onClick={close} role="presentation">
      <div className="oak-popup-stack" onClick={(event) => event.stopPropagation()}>
        {forced && onReturnToSettings ? (
          <button
            type="button"
            className="oak-popup-back"
            onClick={() => {
              setOpen(false);
              onReturnToSettings();
            }}
          >
            <span aria-hidden>←</span>
            설정으로 돌아가기
          </button>
        ) : null}
        <div className="oak-popup-card" role="dialog" aria-modal="true" aria-labelledby="oak-popup-title">
          <div className="oak-popup-hero">
            {popup.imageUrl?.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={popup.imageUrl} alt={popup.banner?.trim() || title} />
            ) : (
              <div className="oak-popup-empty">{popup.emptyImageLabel?.trim() || "배너 이미지"}</div>
            )}
            <button type="button" className="oak-popup-close" onClick={close} aria-label={closeLabel}>
              <span aria-hidden>×</span>
            </button>
          </div>
          <div className="oak-popup-body">
            {popup.banner?.trim() ? <p className="oak-popup-kicker">{popup.banner}</p> : null}
            <h2 id="oak-popup-title" className="oak-popup-title">
              {marked(title)}
            </h2>
            {popup.body?.trim() ? <p className="oak-popup-copy">{marked(popup.body)}</p> : null}
            {perks.length > 0 ? (
              <ul className="oak-popup-perks">
                {perks.map((perk, index) => (
                  <li key={`oak-popup-perk-${index}`}>
                    <span className="oak-popup-check" aria-hidden>
                      ✓
                    </span>
                    <span>{marked(perk)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {popup.disclaimer?.trim() ? <p className="oak-popup-note">{marked(popup.disclaimer)}</p> : null}
            <button type="button" className="oak-popup-cta" onClick={register}>
              {cta}
            </button>
            {phone ? (
              <p className="oak-popup-phone">
                <span>{popup.phonePrefix?.trim() || "바로 상담"}</span>{" "}
                {href ? <a href={href}>{phone}</a> : <b>{phone}</b>}
              </p>
            ) : null}
            <label className="oak-popup-dismiss">
              <input type="checkbox" checked={hideToday} onChange={(event) => setHideToday(event.target.checked)} />
              <span>{popup.hideTodayLabel?.trim() || "오늘 하루 보지 않기"}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
