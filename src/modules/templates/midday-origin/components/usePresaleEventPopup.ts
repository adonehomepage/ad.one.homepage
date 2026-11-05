"use client";

import { useCallback, useEffect, useState } from "react";

export const PRESALE_EVENT_POPUP_STORAGE_KEY = "presale-v2-event-dismissed";

/** 공개 페이지 이벤트 팝업. 모든 스킨에서 동일하게 사용. */
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
    if (sessionStorage.getItem(PRESALE_EVENT_POPUP_STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setEventPopupOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [editMode, enabled, forceOpen]);

  const dismissEventPopup = useCallback((hideToday = false) => {
    setEventPopupOpen(false);
    if (hideToday) sessionStorage.setItem(PRESALE_EVENT_POPUP_STORAGE_KEY, "1");
  }, []);

  return { eventPopupOpen, dismissEventPopup };
}
