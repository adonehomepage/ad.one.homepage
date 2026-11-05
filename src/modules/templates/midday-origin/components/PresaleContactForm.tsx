"use client";

import type { ReactNode, Ref } from "react";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { PresalePrivacyModal } from "./PresalePrivacyModal";
import {
  buildLandingAnalyticsContext,
  trackLandingLeadSubmit,
} from "@midday/lib/landing-analytics";
import { useMiddayAditBridge } from "@midday/adit-bridge";

interface PresaleContactFormProps {
  projectId?: string;
  demoMode?: boolean;
  inModal?: boolean;
  onCloseAfterSuccess?: () => void;
  className?: string;
  submitClassName?: string;
  interestTypeOptions?: { label: string }[];
  cardFooter?: ReactNode;
  /** 개인정보 책임자(법인명) — 동의 전문 1항 사업주체 표기 */
  privacyContactName?: string;
  /** 모달 오픈 시 첫 포커스용 */
  firstFieldRef?: Ref<HTMLInputElement>;
}

export function PresaleContactForm({
  projectId,
  demoMode = false,
  inModal = false,
  onCloseAfterSuccess,
  className = "",
  submitClassName = "presale-submit",
  interestTypeOptions = [],
  cardFooter = null,
  privacyContactName,
  firstFieldRef,
}: PresaleContactFormProps) {
  const bridge = useMiddayAditBridge();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("");
  const [inquiry, setInquiry] = useState("");
  const [agree, setAgree] = useState(false);
  const [agreeThirdParty, setAgreeThirdParty] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const thirdPartyRequired = Boolean(bridge.thirdPartyRequired);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("성함과 연락처를 입력해주세요.");
      return;
    }
    if (!agree) {
      setError("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
    if (thirdPartyRequired && !agreeThirdParty) {
      setError("개인정보 제3자 제공에 동의해주세요.");
      return;
    }
    const slug = bridge.publicSlug?.trim() || null;
    const useDemo = demoMode || bridge.leadDemoMode || !slug;
    if (useDemo) {
      setSubmitting(true);
      setError(null);
      await new Promise((r) => setTimeout(r, 550));
      setSubmitting(false);
      setSuccess(true);
      setName("");
      setPhone("");
      setType("");
      setInquiry("");
      setAgree(false);
      setAgreeThirdParty(false);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const answers: Record<string, unknown> = {};
      if (type.trim()) answers.unitType = type.trim();
      if (inquiry.trim()) answers.inquiry = inquiry.trim();
      const res = await fetch(`/api/public/projects/${encodeURIComponent(slug!)}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          website: "",
          answers,
          consents: { collection: true, thirdParty: thirdPartyRequired ? agreeThirdParty : false },
          utm: Object.fromEntries(new URLSearchParams(window.location.search)),
          referrer: document.referrer,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "등록에 실패했습니다.");
      }
      const path = typeof window !== "undefined" ? window.location.pathname : undefined;
      trackLandingLeadSubmit(
        buildLandingAnalyticsContext({
          projectId: projectId || bridge.projectId || undefined,
          path,
          landingSlug: slug,
        }),
      );
      setSuccess(true);
      setName("");
      setPhone("");
      setType("");
      setInquiry("");
      setAgree(false);
      setAgreeThirdParty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (inModal) {
    if (success) {
      return (
        <div className="presale-rm-success" role="status">
          <div className="presale-rm-success__ring" aria-hidden>
            <div className="presale-rm-success__icon">
              <Check size={22} strokeWidth={2.5} />
            </div>
          </div>
          <h3 className="presale-rm-success__title">등록이 완료되었습니다</h3>
          <p className="presale-rm-success__message">
            {demoMode
              ? "미리보기에서 등록 흐름을 확인했습니다."
              : "담당자가 확인 후 빠르게 연락드리겠습니다."}
          </p>
          {demoMode ? (
            <p className="presale-rm-success__note">실제 등록은 공개된 랜딩 페이지에서만 가능합니다.</p>
          ) : null}
          <div className="presale-rm-success__actions">
            <button type="button" className="presale-rm-success__primary" onClick={() => onCloseAfterSuccess?.()}>
              확인
            </button>
            <button type="button" className="presale-rm-success__secondary" onClick={() => setSuccess(false)}>
              추가 등록
            </button>
          </div>
        </div>
      );
    }

    return (
      <form className="presale-rm-form" onSubmit={handleSubmit}>
        <div className="presale-rm-form__grid">
          <label className="presale-rm-field">
            <span className="presale-rm-field__label">성함</span>
            <span className="presale-rm-field__control">
              <input
                ref={firstFieldRef}
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                autoComplete="name"
              />
            </span>
          </label>
          <label className="presale-rm-field">
            <span className="presale-rm-field__label">연락처</span>
            <span className="presale-rm-field__control">
              <input
                type="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={submitting}
                autoComplete="tel"
              />
            </span>
          </label>
        </div>

        <label className="presale-rm-field presale-rm-field--full">
          <span className="presale-rm-field__label">관심 타입</span>
          <span className="presale-rm-field__control presale-rm-field__control--select">
            <select value={type} onChange={(e) => setType(e.target.value)} disabled={submitting}>
              <option value="">선택 안함</option>
              {interestTypeOptions.map((opt, i) => (
                <option key={i} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown size={16} strokeWidth={2} className="presale-rm-field__chevron" aria-hidden />
          </span>
        </label>

        <label className="presale-rm-field presale-rm-field--full">
          <span className="presale-rm-field__label">문의 내용</span>
          <span className="presale-rm-field__control presale-rm-field__control--textarea">
            <textarea
              rows={3}
              placeholder="궁금하신 점을 자유롭게 남겨주세요"
              value={inquiry}
              onChange={(e) => setInquiry(e.target.value)}
              disabled={submitting}
            />
          </span>
        </label>

        <div className="presale-rm-agree-row">
          <label className={`presale-rm-agree${agree ? " is-checked" : ""}`}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={submitting}
            />
            <span className="presale-rm-agree__box" aria-hidden>
              <Check size={12} strokeWidth={3} />
            </span>
            <span className="presale-rm-agree__text">개인정보 수집 및 이용에 동의합니다</span>
          </label>
          <button
            type="button"
            className="presale-privacy-link"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowPrivacyModal(true);
            }}
          >
            [전문 보기]
          </button>
        </div>
        {thirdPartyRequired ? (
          <div className="presale-rm-agree-row">
            <label className={`presale-rm-agree${agreeThirdParty ? " is-checked" : ""}`}>
              <input
                type="checkbox"
                checked={agreeThirdParty}
                onChange={(e) => setAgreeThirdParty(e.target.checked)}
                disabled={submitting}
              />
              <span className="presale-rm-agree__box" aria-hidden>
                <Check size={12} strokeWidth={3} />
              </span>
              <span className="presale-rm-agree__text">개인정보 제3자 제공에 동의합니다</span>
            </label>
          </div>
        ) : null}

        <PresalePrivacyModal
          open={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
          privacyContactName={privacyContactName}
        />

        {error ? <p className="presale-rm-form__error">{error}</p> : null}

        <button type="submit" className="presale-rm-submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 size={18} strokeWidth={2.25} className="presale-rm-submit__spin" aria-hidden />
              등록 중…
            </>
          ) : (
            <>
              관심고객 등록하기
              <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
            </>
          )}
        </button>
      </form>
    );
  }

  const cardClassName = `presale-form-card ${className}`.trim();

  if (success) {
    return (
      <div className={cardClassName}>
        <p className="presale-form-success">관심고객 등록이 완료되었습니다. 감사합니다.</p>
        {demoMode ? (
          <p className="presale-form-demo-note">실제 등록은 공개된 랜딩 페이지에서만 가능합니다.</p>
        ) : null}
        <button type="button" className={submitClassName} onClick={() => setSuccess(false)}>
          추가 등록하기
        </button>
        {cardFooter}
      </div>
    );
  }

  return (
    <form className={cardClassName} onSubmit={handleSubmit}>
      <div className="presale-fld">
        <label htmlFor="presale-cf-name">성함 (필수)</label>
        <input
          id="presale-cf-name"
          type="text"
          placeholder="홍길동"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="presale-fld">
        <label htmlFor="presale-cf-tel">연락처 (필수)</label>
        <input
          id="presale-cf-tel"
          type="tel"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={submitting}
        />
      </div>
        <div className="presale-fld">
          <label htmlFor="presale-cf-type">관심 타입</label>
          <div className="presale-sel-wrap">
            <select
              id="presale-cf-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={submitting}
            >
              <option value="">선택 안함</option>
              {interestTypeOptions.map((opt, i) => (
                <option key={i} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      <div className="presale-fld">
        <label htmlFor="presale-cf-inquiry">문의 내용</label>
        <textarea
          id="presale-cf-inquiry"
          className="presale-form-textarea"
          rows={3}
          placeholder="궁금하신 점을 자유롭게 남겨주세요"
          value={inquiry}
          onChange={(e) => setInquiry(e.target.value)}
          disabled={submitting}
        />
      </div>
      <div className="presale-agree-row">
        <label className="presale-agree">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            disabled={submitting}
          />
          <span>개인정보 수집 및 이용에 동의합니다</span>
        </label>
        <button
          type="button"
          className="presale-privacy-link"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowPrivacyModal(true);
          }}
        >
          [전문 보기]
        </button>
      </div>
      {thirdPartyRequired ? (
        <div className="presale-agree-row">
          <label className="presale-agree">
            <input
              type="checkbox"
              checked={agreeThirdParty}
              onChange={(e) => setAgreeThirdParty(e.target.checked)}
              disabled={submitting}
            />
            <span>개인정보 제3자 제공에 동의합니다</span>
          </label>
        </div>
      ) : null}
      <PresalePrivacyModal
        open={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        privacyContactName={privacyContactName}
      />
      {demoMode ? (
        <p className="presale-form-demo-hint">미리보기입니다. 제출하면 등록 완료 화면을 확인할 수 있습니다.</p>
      ) : null}
      {error ? <p className="presale-form-error">{error}</p> : null}
      <button type="submit" className={submitClassName} disabled={submitting}>
        {submitting ? "등록 중…" : "관심고객 등록하기"}
      </button>
      {cardFooter}
    </form>
  );
}
