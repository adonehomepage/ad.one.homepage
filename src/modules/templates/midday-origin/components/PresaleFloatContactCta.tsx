"use client";

import { Phone } from "lucide-react";

interface PresaleFloatContactCtaProps {
  phone: string;
  visible?: boolean;
  onRegister: () => void;
}

/** Dock 내부용. 스킨 뷰에서는 PresaleFloatDock만 쓸 것. */
export function PresaleFloatContactCta({
  phone,
  visible = true,
  onRegister,
}: PresaleFloatContactCtaProps) {
  const digits = phone.replace(/\D/g, "");
  const label = phone.trim() || "문의번호";

  const phoneInner = (
    <>
      <span className="presale-float-contact__phone-icon" aria-hidden>
        <Phone size={16} strokeWidth={2.4} />
      </span>
      {label}
    </>
  );

  return (
    <div className={`presale-float-contact${visible ? " is-visible" : ""}`}>
      {digits ? (
        <a className="presale-float-contact__phone" href={`tel:${digits}`}>
          {phoneInner}
        </a>
      ) : (
        <span className="presale-float-contact__phone">{phoneInner}</span>
      )}
      <button type="button" className="presale-float-contact__register" onClick={onRegister}>
        관심고객등록
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}
