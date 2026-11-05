"use client";

import { useEffect, useId, useState } from "react";
import { Phone, X } from "lucide-react";
import { PresaleFloatBrandApps } from "./PresaleFloatBrandApps";
import { PresaleFloatContactCta } from "./PresaleFloatContactCta";

interface PresaleFloatDockProps {
  phone: string;
  visible?: boolean;
  onRegister: () => void;
  /** 태블릿·모바일 — 접힌 버튼, 누르면 패널 펼침 */
  collapsible?: boolean;
  /** 애드잇에서는 직방·호갱노노 바로가기를 숨긴다 */
  hideBrandApps?: boolean;
}

/**
 * 분양 랜딩 공통 플로트. 스킨 뷰는 이것만 쓴다.
 * PC는 패널, 태블릿·모바일은 문의번호 버튼을 눌러 펼친다.
 */
export function PresaleFloatDock({
  phone,
  visible = true,
  onRegister,
  collapsible = false,
  hideBrandApps = false,
}: PresaleFloatDockProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!collapsible) setOpen(false);
  }, [collapsible]);

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  useEffect(() => {
    if (!collapsible || !open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [collapsible, open]);

  const handleRegister = () => {
    setOpen(false);
    onRegister();
  };

  const panel = (
    <div
      id={panelId}
      className={`presale-float-dock${visible && (!collapsible || open) ? " is-visible" : ""}`}
    >
      <PresaleFloatContactCta phone={phone} visible onRegister={handleRegister} />
      {hideBrandApps ? null : <PresaleFloatBrandApps compact />}
    </div>
  );

  if (!collapsible) return panel;

  return (
    <div
      className={`presale-float-dock-wrap${visible ? " is-visible" : ""}${open ? " is-open" : ""}`}
    >
      {open ? (
        <button
          type="button"
          className="presale-float-dock-scrim"
          aria-label="문의번호 닫기"
          onClick={() => setOpen(false)}
        />
      ) : null}
      {panel}
      <button
        type="button"
        className="presale-float-dock-fab"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? (
          <>
            <X size={18} strokeWidth={2.4} aria-hidden />
            닫기
          </>
        ) : (
          <>
            <Phone size={16} strokeWidth={2.4} aria-hidden />
            문의번호
          </>
        )}
      </button>
    </div>
  );
}
