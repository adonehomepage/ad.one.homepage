"use client";

import { useCallback, useEffect, useState } from "react";

export const PRESALE_EVENT_POPUP_STORAGE_KEY = "presale-v2-event-dismissed";

function popupDayKey() {
  return `adone-popup-day-${window.location.pathname}`;
}

function hiddenForToday() {
  const until = Number(localStorage.getItem(popupDayKey()) || 0);
  if (until > Date.now()) return true;
  // 이전에 이 탭에서만 닫아 둔 기록도 같은 방문에서는 유지한다.
  return Boolean(sessionStorage.getItem(PRESALE_EVENT_POPUP_STORAGE_KEY));
}

/** 공개 페이지 이벤트 팝업. 「오늘 하루 보지 않기」는 자정까지 이 주소에만 적용한다. */
export function usePresaleEventPopup(enabled: boolean, editMode: boolean, forceOpen = false) {
  const [eventPopupOpen, setEventPopupOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setEventPopupOpen(true);
      return;
    }
    if (typeof window === "undefined" || editMode) {
      setEventPopupOpen(false);
      return;
    }
    if (!enabled) return;
    if (hiddenForToday()) return;
    const timer = window.setTimeout(() => setEventPopupOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [editMode, enabled, forceOpen]);

  const dismissEventPopup = useCallback((hideToday = false) => {
    setEventPopupOpen(false);
    if (!hideToday) return;
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    localStorage.setItem(popupDayKey(), String(end.getTime()));
  }, []);

  return { eventPopupOpen, dismissEventPopup };
}
