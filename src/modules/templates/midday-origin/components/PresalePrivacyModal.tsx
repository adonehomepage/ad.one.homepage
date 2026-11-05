"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * 관심고객 등록 시 개인정보 수집·이용 동의 전문.
 * 내부 수집 재개 기준 — 사업주체 수집 + 애드잇 시스템 운영 위탁 안내.
 */
export function PresalePrivacyModalContent({
  privacyContactName,
}: {
  privacyContactName?: string;
}) {
  const name = privacyContactName?.trim();
  return (
    <div className="presale-privacy-content">
      <p className="presale-privacy-content__title">[개인정보 수집 및 이용 동의]</p>

      <p>
        <span className="presale-privacy-content__heading">1. 개인정보 수집 및 이용 주체</span>
        <br />
        {name ? (
          <>
            본 페이지에 명시된 <span className="presale-privacy-content__emph">[{name}]</span> 분양 사업
            주체(이하 &quot;사업주체&quot;)
          </>
        ) : (
          <>본 페이지에 명시된 분양 사업 주체(이하 &quot;사업주체&quot;)</>
        )}
      </p>

      <p>
        <span className="presale-privacy-content__heading">2. 수집 및 이용 목적</span>
        <br />
        모델하우스 방문 예약, 분양 상담, 당첨자 안내, 고객 문의 응대 및 관련 정보 제공
      </p>

      <p>
        <span className="presale-privacy-content__heading">3. 수집하는 항목</span>
        <br />
        필수항목: 성명, 휴대전화번호
        <br />
        선택항목: 관심평형, 거주지, 기타 문의사항
      </p>

      <p>
        <span className="presale-privacy-content__heading">4. 보유 및 이용 기간</span>
        <br />
        수집된 개인정보는 분양 완료 또는 고객의 동의 철회 시까지 보관 및 이용됩니다.
        <br />
        단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관될 수 있습니다.
      </p>

      <div>
        <p className="presale-privacy-content__heading">5. 개인정보 처리 위탁 안내</p>
        <p>
          사업주체는 원활한 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁할 수 있습니다.
        </p>
        <p>
          수탁업체(시스템 운영): 애드잇(광고 랜딩·관심고객 수집 시스템)
          <br />
          위탁 업무 내용:
        </p>
        <ul>
          <li>랜딩페이지 및 관심고객 등록 시스템 운영</li>
          <li>DB 기술 보안 및 관리 시스템 제공</li>
        </ul>
      </div>

      <p className="presale-privacy-content__note">
        ※ 본 페이지의 시스템 운영은 애드잇이 제공하며,
        <br />
        수집된 개인정보의 이용 및 상담 주체는 본 페이지에 명시된 사업주체입니다.
      </p>

      <p>
        <span className="presale-privacy-content__heading">6. 동의를 거부할 권리</span>
        <br />
        고객은 개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다.
        <br />
        다만, 필수항목 수집에 동의하지 않을 경우 관심고객 등록이 제한될 수 있습니다.
      </p>
    </div>
  );
}

interface PresalePrivacyModalProps {
  open: boolean;
  onClose: () => void;
  privacyContactName?: string;
}

export function PresalePrivacyModal({
  open,
  onClose,
  privacyContactName,
}: PresalePrivacyModalProps) {
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

  return (
    <div
      className="presale-privacy-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="presale-privacy-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="개인정보 수집 및 이용 동의 전문"
      >
        <button
          ref={closeRef}
          type="button"
          className="presale-privacy-sheet__close"
          onClick={onClose}
          aria-label="닫기"
        >
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
        <PresalePrivacyModalContent privacyContactName={privacyContactName} />
      </div>
    </div>
  );
}
