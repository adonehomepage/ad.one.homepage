"use client";

import { useEffect, useRef, useState } from "react";
import type { PageSection, PageSnapshot } from "@/types";
import { floorplanSpecs, sectionEyebrowText } from "@/modules/templates/definitions";
import { formatPhoneInput, isKoreanMobile } from "@/lib/validation/phone";
import { trackPublicEvent } from "@/modules/templates/render/tracker";
import { chromeText, useCanvasEdit, useEditorChrome, type CanvasEdit } from "@/modules/editor/edit-context";
import { InlineText, MarkedText } from "@/modules/editor/inline-text";
import { useDialogFocusTrap } from "@/lib/a11y/dialog-focus";
import { cn } from "@/lib/cn";

export function LeadForm({
  snapshot,
  section,
  disabled,
  variant = "section",
  narrow = false,
}: {
  snapshot: PageSnapshot;
  section: PageSection;
  disabled?: boolean;
  variant?: "section" | "popup";
  narrow?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const started = useRef(false);
  const privacy = snapshot.privacy;
  const edit = useCanvasEdit();
  const chrome = useEditorChrome();

  function onFormStart() {
    if (disabled || started.current) return;
    started.current = true;
    trackPublicEvent(snapshot.publicSlug, "lead_form_start");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || submitting) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    if (!name) {
      setStatus("error");
      setMessage(formCopy(section, "nameError", chromeText(chrome, "formNameErrorPh", "이름을 입력해 주세요.")));
      return;
    }
    if (!isKoreanMobile(phone)) {
      setStatus("error");
      setMessage(formCopy(section, "phoneError", chromeText(chrome, "formPhoneErrorPh", "올바른 휴대전화 번호를 입력해 주세요.")));
      return;
    }
    if (form.get("collection") !== "on") {
      setStatus("error");
      setMessage(formCopy(section, "collectionError", chromeText(chrome, "formCollectionErrorPh", "개인정보 수집 및 이용에 동의해 주세요.")));
      return;
    }
    if (privacy.thirdPartyProvisionEnabled && form.get("thirdParty") !== "on") {
      setStatus("error");
      setMessage(formCopy(section, "thirdPartyError", chromeText(chrome, "formThirdErrorPh", "개인정보 제3자 제공에 동의해 주세요.")));
      return;
    }
    const answers: Record<string, unknown> = {};
    for (const field of snapshot.formSettings.fields) {
      if (field.type === "name" || field.type === "phone") continue;
      answers[field.key] = field.type === "checkbox" ? form.getAll(field.key) : form.get(field.key);
    }
    const payload = {
      name,
      phone,
      website: String(form.get("website") ?? ""),
      answers,
      consents: {
        collection: true,
        thirdParty: form.get("thirdParty") === "on",
      },
      utm: Object.fromEntries(new URLSearchParams(window.location.search)),
      referrer: document.referrer,
    };
    setSubmitting(true);
    setStatus("idle");
    setMessage("");
    try {
      const res = await fetch(`/api/public/projects/${encodeURIComponent(snapshot.publicSlug)}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(json.message ?? formCopy(section, "submitError", chromeText(chrome, "formSubmitErrorPh", "등록에 실패했습니다.")));
        trackPublicEvent(snapshot.publicSlug, "lead_submit_error");
        return;
      }
      trackPublicEvent(snapshot.publicSlug, "lead_submit_success");
      setStatus("ok");
      setMessage(snapshot.formSettings.successMessage || chromeText(chrome, "formSuccessDonePh", "관심고객 등록이 완료되었습니다."));
      event.currentTarget.reset();
    } catch {
      setStatus("error");
      setMessage(formCopy(section, "submitError", chromeText(chrome, "formSubmitErrorPh", "등록에 실패했습니다.")));
    } finally {
      setSubmitting(false);
    }
  }

  const localPhone = String(section.content.phone ?? "");
  const inquiryPhone = localPhone.trim() || snapshot.phone;
  const hero = snapshot.sections.find((section) => section.sectionType === "hero");
  const cta =
    String(hero?.content.ctaLabel ?? snapshot.globalSettings.ctaLabel ?? "").trim() || chromeText(chrome, "phCta", "관심고객 등록");
  function renameField(key: string, label: string) {
    edit?.setFields(snapshot.formSettings.fields.map((item) => (item.key === key ? { ...item, label } : item)));
  }
  function setHelper(key: string, helperText: string) {
    edit?.setFields(snapshot.formSettings.fields.map((item) => (item.key === key ? { ...item, helperText } : item)));
  }
  function fieldTitle(field: PageSnapshot["formSettings"]["fields"][number]) {
    return (
      <>
        {edit ? (
          <InlineText value={field.label} placeholder={chromeText(chrome, "formFieldNamePh", "항목 이름")} onCommit={(value) => renameField(field.key, value)} />
        ) : (
          field.label
        )}
        {field.required ? " *" : ""}
      </>
    );
  }
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const perks = ((section.content.perks as Array<{ text?: string } | string> | undefined) ?? []).map((item) =>
    typeof item === "string" ? item : String(item.text ?? ""),
  );
  const showPerks = variant === "section" && (Boolean(edit) || perks.some((perk) => perk.trim()) || Boolean(section.content.perkHeadline) || Boolean(section.content.perkBody));
  function setPerks(next: string[]) {
    edit?.patch(section.id, { ...section.content, perks: next.map((text) => ({ text })) });
  }
  return (
    <div className={variant === "popup" ? "px-6 py-6" : "mx-auto max-w-6xl px-4 py-20"}>
      {variant === "section" ? (
        <p className="text-sm font-semibold text-primary">
          <InlineText
            value={String(section.content.eyebrow ?? "").trim() || sectionEyebrowText(chrome, "lead_form")}
            placeholder={chromeText(chrome, "formEyebrowPh", "작은 제목")}
            onCommit={
              edit
                ? (value) =>
                    edit.patch(section.id, {
                      ...section.content,
                      eyebrow: value.trim() === sectionEyebrowText(chrome, "lead_form") ? "" : value,
                    })
                : undefined
            }
          />
        </p>
      ) : null}
      <h2 className={variant === "popup" ? "text-2xl font-bold break-keep" : "mt-2 text-3xl font-bold break-keep"}>
        <InlineText
          value={String(section.content.heading ?? chromeText(chrome, "formHeadingDefault", "관심고객등록"))}
          placeholder={chromeText(chrome, "formHeadingPh", "제목")}
          onCommit={edit ? (value) => edit.patch(section.id, { ...section.content, heading: value }) : undefined}
        />
      </h2>
      {variant === "section" && (edit || String(section.content.body ?? "").trim()) ? (
        <p className="mt-4 max-w-3xl text-text-body">
          {edit ? (
            <InlineText
              value={String(section.content.body ?? "")}
              multiline
              placeholder={chromeText(chrome, "formBodyPh", "본문")}
              onCommit={(value) => edit.patch(section.id, { ...section.content, body: value })}
            />
          ) : (
            <MarkedText text={String(section.content.body ?? "")} />
          )}
        </p>
      ) : null}
      <div className={cn("mt-8 grid gap-8", showPerks && !narrow && "lg:grid-cols-2 lg:items-start lg:gap-10")}>
        {showPerks ? (
          <div>
            <h3 className="text-xl font-semibold break-keep">
              <InlineText
                value={String(section.content.perkHeadline ?? "")}
                placeholder={chromeText(chrome, "formPerkTitlePh", "혜택 제목")}
                onCommit={edit ? (value) => edit.patch(section.id, { ...section.content, perkHeadline: value }) : undefined}
              />
            </h3>
              <p className="mt-3 text-text-body">
                {edit ? (
                  <InlineText
                    value={String(section.content.perkBody ?? "")}
                    multiline
                    placeholder={chromeText(chrome, "formPerkBodyPh", "혜택 설명")}
                    onCommit={(value) => edit.patch(section.id, { ...section.content, perkBody: value })}
                  />
                ) : (
                  <MarkedText text={String(section.content.perkBody ?? "")} />
                )}
              </p>
            <ul className="mt-4 space-y-2">
              {perks.map((perk, index) => !edit && !perk.trim() ? null : (
                <li key={index} className="flex items-start gap-2 text-text-body">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">✓</span>
                  {edit ? (
                    <InlineText
                      value={perk}
                      placeholder={chromeText(chrome, "formPerkItemPh", "혜택")}
                      onCommit={(value) => setPerks(perks.map((item, itemIndex) => (itemIndex === index ? value : item)))}
                    />
                  ) : (
                    <MarkedText text={perk} />
                  )}
                  {edit && perks.length > 1 ? (
                    <span className="flex shrink-0 gap-2 text-xs">
                      <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === 0} onClick={() => {
                        const next = [...perks];
                        const [row] = next.splice(index, 1);
                        if (!row) return;
                        next.splice(index - 1, 0, row);
                        setPerks(next);
                      }}>{chromeText(chrome, "editBefore", "앞")}</button>
                      <button type="button" className="text-text-body disabled:text-text-muted" disabled={index === perks.length - 1} onClick={() => {
                        const next = [...perks];
                        const [row] = next.splice(index, 1);
                        if (!row) return;
                        next.splice(index + 1, 0, row);
                        setPerks(next);
                      }}>{chromeText(chrome, "editAfter", "뒤")}</button>
                      <button type="button" className="text-text-muted" onClick={() => setPerks(perks.filter((_, itemIndex) => itemIndex !== index))}>
                        {chromeText(chrome, "editRemove", "삭제")}
                      </button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            {edit ? (
              <button type="button" className="mt-3 text-sm font-medium text-primary" disabled={perks.length >= 8} onClick={() => setPerks([...perks, chromeText(chrome, "formPerkPh", "혜택을 입력하세요")])}>
                {chromeText(chrome, "editAddPerk", "혜택 추가")}
              </button>
            ) : null}
          </div>
        ) : null}
        <div>
      {status === "ok" ? (
        <div role="status" aria-live="polite" className="rounded-[16px] border border-border px-6 py-10 text-center">
          <p className="text-xl font-bold text-text-primary">
            {edit ? (
              <InlineText value={snapshot.formSettings.successTitle ?? ""} placeholder={chromeText(chrome, "formSuccessTitlePh", "등록이 완료되었습니다")} onCommit={edit.setSuccessTitle} />
            ) : (
              snapshot.formSettings.successTitle?.trim() || chromeText(chrome, "formSuccessTitlePh", "등록이 완료되었습니다")
            )}
          </p>
          <p className="mt-3 text-text-body">
            {edit ? (
              <InlineText
                value={snapshot.formSettings.successMessage}
                multiline
                placeholder={chromeText(chrome, "formSuccessBodyPh", "완료 안내")}
                onCommit={edit.setSuccessMessage}
              />
            ) : (
              message
            )}
          </p>
          {disabled ? (
            <p className="mt-2 text-sm text-text-muted">
              {edit ? (
                <InlineText value={snapshot.formSettings.previewNote ?? ""} placeholder={chromeText(chrome, "formPreviewNotePh", "미리보기에서는 실제 등록이 저장되지 않습니다.")} onCommit={edit.setPreviewNote} />
              ) : (
                snapshot.formSettings.previewNote?.trim() || chromeText(chrome, "formPreviewNotePh", "미리보기에서는 실제 등록이 저장되지 않습니다.")
              )}
            </p>
          ) : null}
          <button
            type="button"
            className="mt-6 inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white"
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
              setStatus("idle");
              setMessage("");
            }}
          >
            {edit ? (
              <InlineText value={snapshot.formSettings.againLabel ?? ""} placeholder={chromeText(chrome, "formAgainPh", "추가 등록")} className="text-white" onCommit={edit.setAgainLabel} />
            ) : (
              snapshot.formSettings.againLabel?.trim() || chromeText(chrome, "formAgainPh", "추가 등록")
            )}
          </button>
        </div>
      ) : (
      <>
      <p className="text-text-body">
        {edit ? (
          <>
            <InlineText
              value={snapshot.formSettings.intro || String(section.content.intro ?? "")}
              multiline
              placeholder={chromeText(chrome, "formIntroPh", "안내 문구")}
              onCommit={edit.setIntro}
            />
            <span className="mt-1 block text-xs text-text-muted">{chromeText(chrome, "hintBold", "**이렇게** 감싸면 공개 페이지에서 굵게 보입니다.")}</span>
          </>
        ) : (
          <MarkedText text={snapshot.formSettings.intro || String(section.content.intro ?? "")} />
        )}
      </p>
      <form className={variant === "popup" ? "mt-4 space-y-3" : "mt-8 space-y-4"} onSubmit={onSubmit} onFocus={onFormStart}>
        <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />
        {snapshot.formSettings.fields.filter((field) => field.visible).map((field) =>
          field.type === "select" && field.key === "unitType" ? (
            <InterestTypes
              key={field.key}
              name={field.key}
              required={field.required}
              options={field.options ?? []}
              helperText={field.helperText}
              label={field.label}
              onLabelCommit={edit ? (value) => renameField(field.key, value) : undefined}
              onHelperCommit={edit ? (value) => setHelper(field.key, value) : undefined}
              emptyLabel={String(section.content.emptyUnitTypeLabel ?? "")}
              onEmptyCommit={edit ? (value) => edit.patch(section.id, { ...section.content, emptyUnitTypeLabel: value }) : undefined}
              details={interestDetails(snapshot)}
            />
          ) : field.type === "radio" || field.type === "checkbox" ? (
            <fieldset key={field.key} className="space-y-2">
              <legend className="text-sm font-medium">{fieldTitle(field)}</legend>
              {(field.options ?? []).map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm">
                  <input type={field.type} name={field.key} value={option} required={field.type === "radio" && field.required} disabled={disabled || submitting} />
                  {option}
                </label>
              ))}
              {edit || field.helperText ? (
                <p className="text-xs text-text-muted">
                  {edit ? <InlineText value={field.helperText ?? ""} placeholder={chromeText(chrome, "formHelperPh", "도움말")} onCommit={(value) => setHelper(field.key, value)} /> : field.helperText}
                </p>
              ) : null}
            </fieldset>
          ) : (
            <label key={field.key} className="block space-y-1.5">
              <span className="text-sm font-medium">{fieldTitle(field)}</span>
              {field.type === "textarea" ? (
                <textarea name={field.key} required={field.required} disabled={disabled || submitting} placeholder={fieldPlaceholder(field, chrome)} className="ui-field h-auto min-h-28 py-3" />
              ) : field.type === "select" ? (
                <select name={field.key} required={field.required} disabled={disabled || submitting} className="ui-field">
                  <option value="">{field.placeholder?.trim() || chromeText(chrome, "formSelectPh", "선택")}</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : field.type === "phone" ? (
                <PhoneInput name={field.key} required={field.required} disabled={disabled || submitting} placeholder={fieldPlaceholder(field, chrome)} />
              ) : (
                <input
                  name={field.key}
                  required={field.required}
                  disabled={disabled || submitting}
                  placeholder={fieldPlaceholder(field, chrome)}
                  type={field.type === "date" ? "date" : "text"}
                  autoComplete={field.type === "name" ? "name" : "off"}
                  className="ui-field"
                />
              )}
              {edit || field.helperText ? (
                <p className="text-xs text-text-muted">
                  {edit ? <InlineText value={field.helperText ?? ""} placeholder={chromeText(chrome, "formHelperPh", "도움말")} onCommit={(value) => setHelper(field.key, value)} /> : field.helperText}
                </p>
              ) : null}
            </label>
          ),
        )}
        <div className="flex flex-wrap items-start gap-2 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" name="collection" required disabled={disabled || submitting} className="mt-1" />
            <span onClick={edit ? (event) => event.preventDefault() : undefined}>
              {edit ? (
                <InlineText
                  value={String(section.content.collectionConsent ?? "")}
                  placeholder={chromeText(chrome, "formConsentPh", "[필수] 개인정보 수집 및 이용에 동의합니다.")}
                  onCommit={(value) => edit.patch(section.id, { ...section.content, collectionConsent: value })}
                />
              ) : (
                String(section.content.collectionConsent ?? "").trim() || chromeText(chrome, "formConsentPh", "[필수] 개인정보 수집 및 이용에 동의합니다.")
              )}
            </span>
          </label>
          <button type="button" className="font-semibold text-primary" onClick={(event) => {
            if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
            setPrivacyOpen(true);
          }}>
            {edit ? (
              <InlineText value={String(section.content.privacyLinkLabel ?? "")} placeholder={chromeText(chrome, "formPrivacyLinkPh", "내용 보기")} onCommit={(value) => edit.patch(section.id, { ...section.content, privacyLinkLabel: value })} />
            ) : (
              String(section.content.privacyLinkLabel ?? "").trim() || chromeText(chrome, "formPrivacyLinkPh", "내용 보기")
            )}
          </button>
        </div>
        {privacyOpen ? <PrivacyNotice privacy={privacy} onClose={() => setPrivacyOpen(false)} edit={edit} /> : null}
        {privacy.thirdPartyProvisionEnabled ? (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="thirdParty" required disabled={disabled || submitting} className="mt-1" />
            <span onClick={edit ? (event) => event.preventDefault() : undefined}>
              {edit ? (
                <InlineText
                  value={String(section.content.thirdPartyConsent ?? "")}
                  placeholder={chromeText(chrome, "formThirdPh", "[필수] 개인정보 제3자 제공에 동의합니다.")}
                  onCommit={(value) => edit.patch(section.id, { ...section.content, thirdPartyConsent: value })}
                />
              ) : (
                String(section.content.thirdPartyConsent ?? "").trim() || chromeText(chrome, "formThirdPh", "[필수] 개인정보 제3자 제공에 동의합니다.")
              )}
              {" "}
              {chromeText(chrome, "noticeThirdRecipient", "제공받는 자")}: {privacy.thirdPartyRecipientName}.{" "}
              {chromeText(chrome, "noticePurpose", "목적")}: {privacy.thirdPartyPurpose}.
            </span>
          </label>
        ) : null}
        {privacy.collectingControllerName === "처리주체미정" ? (
          <p className="text-sm text-danger">
            {edit ? (
              <InlineText
                value={String(section.content.controllerWarning ?? "")}
                placeholder={chromeText(chrome, "formControllerWarnPh", "개인정보 처리 주체가 확정되기 전에는 실제 접수가 저장되지 않을 수 있습니다.")}
                onCommit={(value) => edit.patch(section.id, { ...section.content, controllerWarning: value })}
              />
            ) : (
              formCopy(section, "controllerWarning", chromeText(chrome, "formControllerWarnPh", "개인정보 처리 주체가 확정되기 전에는 실제 접수가 저장되지 않을 수 있습니다."))
            )}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={disabled || submitting}
          aria-busy={submitting || undefined}
          className="inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-primary text-[17px] font-semibold text-white disabled:opacity-50"
        >
          {submitting ? (
            edit ? (
              <InlineText value={snapshot.formSettings.submittingLabel ?? ""} placeholder={chromeText(chrome, "formSubmittingPh", "등록 중")} className="text-white" onCommit={edit.setSubmittingLabel} />
            ) : (
              snapshot.formSettings.submittingLabel?.trim() || chromeText(chrome, "formSubmittingPh", "등록 중")
            )
          ) : cta}
        </button>
        {variant === "section" && (edit || localPhone.trim() || snapshot.phone) ? (
          <p className="text-center text-sm text-text-body">
            {edit ? (
              <InlineText value={String(section.content.phoneCaption ?? "")} placeholder={chromeText(chrome, "formPhoneCaptionPh", "문의번호")} onCommit={(value) => edit.patch(section.id, { ...section.content, phoneCaption: value })} />
            ) : (
              String(section.content.phoneCaption ?? "").trim() || chromeText(chrome, "formPhoneCaptionPh", "문의번호")
            )}{" "}
            {edit ? (
              <InlineText
                value={localPhone}
                placeholder={chromeText(chrome, "formPhoneEmptyPh", "비우면 대표 전화")}
                onCommit={(value) => edit.patch(section.id, { ...section.content, phone: value })}
              />
            ) : !disabled && inquiryPhone.replace(/\D/g, "") ? (
              <a href={`tel:${inquiryPhone.replace(/\D/g, "")}`} className="font-semibold text-primary">{inquiryPhone}</a>
            ) : (
              <span className="font-semibold text-text-primary">{inquiryPhone}</span>
            )}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-danger" role="alert" aria-live="assertive">
            {message}
          </p>
        ) : null}
        {disabled ? (
          <button
            type="button"
            className="text-sm font-semibold text-primary"
            onClick={() => {
              setStatus("ok");
              setMessage(snapshot.formSettings.successMessage || chromeText(chrome, "formSuccessDonePh", "관심고객 등록이 완료되었습니다."));
            }}
          >
            {chromeText(chrome, "hintPreviewDone", "완료 화면 보기")}
          </button>
        ) : null}
      </form>
      </>
      )}
        </div>
      </div>
    </div>
  );
}

function fieldPlaceholder(field: { type: string; placeholder?: string }, chrome: Record<string, string>) {
  if (field.placeholder?.trim()) return field.placeholder;
  if (field.type === "name") return chromeText(chrome, "formNamePh", "홍길동");
  if (field.type === "phone") return chromeText(chrome, "formPhonePh", "010-0000-0000");
  if (field.type === "textarea") return chromeText(chrome, "formTextareaPh", "궁금하신 점을 남겨 주세요");
  return undefined;
}
function interestDetails(snapshot: PageSnapshot) {
  const chrome = (snapshot.globalSettings ?? {}) as Record<string, unknown>;
  const mark = chromeText(chrome, "seedPlaceholderMark", "입력하세요");
  const floor = snapshot.sections.find((section) => section.sectionType === "floorplan");
  const types = (floor?.content.types as Array<{ name?: string; summary?: string; specs?: Array<{ label?: string; value?: string }> }> | undefined) ?? [];
  const details: Record<string, string> = {};
  for (const type of types) {
    const name = String(type.name ?? "").trim();
    if (!name || details[name]) continue;
    const summary = String(type.summary ?? "").trim();
    const specLine = floorplanSpecs(
      {
        ...type,
        specs: (type.specs ?? []).map((spec) => ({ label: String(spec.label ?? ""), value: String(spec.value ?? "") })),
      },
      chrome,
    )
      .filter((spec) => spec.value.trim() && !(mark && spec.value.includes(mark)))
      .slice(0, 3)
      .map((spec) => `${spec.label} ${spec.value.trim()}`)
      .join(" · ");
    const text = [mark && summary.includes(mark) ? "" : summary, specLine].filter(Boolean).join(" · ");
    if (text) details[name] = text;
  }
  return details;
}

function PhoneInput({ name, required, disabled, placeholder }: { name: string; required: boolean; disabled?: boolean; placeholder?: string }) {
  const [value, setValue] = useState("");
  return (
    <input
      name={name}
      required={required}
      disabled={disabled}
      type="tel"
      inputMode="numeric"
      autoComplete="tel"
      placeholder={placeholder || "010-0000-0000"}
      value={value}
      className="ui-field"
      onChange={(event) => setValue(formatPhoneInput(event.target.value))}
    />
  );
}

function InterestTypes({
  name,
  label,
  required,
  options,
  helperText,
  onLabelCommit,
  onHelperCommit,
  emptyLabel = "",
  onEmptyCommit,
  details = {},
}: {
  name: string;
  label: string;
  required: boolean;
  options: string[];
  helperText?: string;
  onLabelCommit?: (value: string) => void;
  onHelperCommit?: (value: string) => void;
  emptyLabel?: string;
  onEmptyCommit?: (value: string) => void;
  details?: Record<string, string>;
}) {
  const chrome = useEditorChrome();
  const [picked, setPicked] = useState<string[]>([]);
  function toggle(option: string) {
    setPicked((current) => (current.includes(option) ? current.filter((item) => item !== option) : [...current, option]));
  }
  const emptyPh = chromeText(chrome, "formUnitEmptyPh", "평면안내에서 타입 이름을 입력하면 여기에 나타납니다.");
  const helperPh = chromeText(chrome, "formUnitHelperPh", "여러 타입을 고를 수 있습니다. 이름은 평면안내와 맞춰집니다.");
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {onLabelCommit ? <InlineText value={label} placeholder={chromeText(chrome, "formFieldNamePh", "항목 이름")} onCommit={onLabelCommit} /> : label}
        {required ? " *" : ""}
      </legend>
      <input type="text" name={name} value={picked.join(", ")} required={required} readOnly className="sr-only" tabIndex={-1} />
      {options.length === 0 ? (
        <p className="text-sm text-text-muted">
          {onEmptyCommit ? (
            <InlineText value={emptyLabel} placeholder={emptyPh} onCommit={onEmptyCommit} />
          ) : (
            emptyLabel.trim() || emptyPh
          )}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const active = picked.includes(option);
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                className={cn(
                  "inline-flex h-12 items-center rounded-[14px] px-4 text-sm font-semibold",
                  active ? "bg-primary text-white" : "border border-border bg-white text-text-primary",
                )}
                onClick={() => toggle(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
      {onHelperCommit ? (
        <p className="text-xs text-text-muted">
          <InlineText value={helperText ?? ""} placeholder={helperPh} onCommit={onHelperCommit} />
        </p>
      ) : (
        <p className="text-xs text-text-muted">{helperText || helperPh}</p>
      )}
      {picked.some((option) => details[option]) ? (
        <ul className="space-y-1 text-sm text-text-body">
          {picked.map((option) => (details[option] ? <li key={option}>{option} · {details[option]}</li> : null))}
        </ul>
      ) : null}
    </fieldset>
  );
}

function formCopy(section: PageSection, key: string, fallback: string) {
  return String(section.content[key] ?? "").trim() || fallback;
}

function noticeHeading(
  privacy: PageSnapshot["privacy"],
  key: keyof NonNullable<PageSnapshot["privacy"]["noticeLabels"]>,
  fallback: string,
  edit: CanvasEdit | null,
) {
  const value = privacy.noticeLabels?.[key] ?? "";
  if (!edit) return value.trim() || fallback;
  return (
    <InlineText
      value={value}
      placeholder={fallback}
      className="text-inherit"
      onCommit={(text) => edit.setPrivacy({ ...privacy, noticeLabels: { ...privacy.noticeLabels, [key]: text } })}
    />
  );
}

function PrivacyNotice({
  privacy,
  onClose,
  edit,
}: {
  privacy: PageSnapshot["privacy"];
  onClose: () => void;
  edit: CanvasEdit | null;
}) {
  const chrome = useEditorChrome();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useDialogFocusTrap({
    open: true,
    panelRef,
    initialFocusRef: closeRef,
    onEscape: onClose,
  });
  const operator = privacy.operatingCompanyName.trim();
  const showOperator = operator && operator !== "운영법인미정";
  const thirdLine = [
    `${chromeText(chrome, "noticeThirdRecipient", "제공받는 자")}: ${privacy.thirdPartyRecipientName}`,
    `${chromeText(chrome, "noticePurpose", "목적")}: ${privacy.thirdPartyPurpose}`,
    `${chromeText(chrome, "noticeFields", "항목")}: ${(privacy.thirdPartyFields ?? []).join(", ")}`,
    `${chromeText(chrome, "noticePeriod", "기간")}: ${privacy.thirdPartyRetentionDescription}`,
  ].join(". ");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 p-4" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-notice-title"
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-[16px] border border-border bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="privacy-notice-title" className="text-lg font-bold">
          {noticeHeading(privacy, "title", chromeText(chrome, "noticeTitle", "개인정보 수집 및 이용"), edit)}
        </h3>
        <div className="mt-4 space-y-3 text-sm text-text-body">
          <p>
            <span className="font-semibold text-text-primary">{noticeHeading(privacy, "controller", chromeText(chrome, "noticeController", "수집 주체"), edit)}</span>
            <br />
            {privacy.collectingControllerName}
          </p>
          <p>
            <span className="font-semibold text-text-primary">{noticeHeading(privacy, "purpose", chromeText(chrome, "noticePurpose", "목적"), edit)}</span>
            <br />
            {privacy.collectionPurpose}
          </p>
          <p>
            <span className="font-semibold text-text-primary">{noticeHeading(privacy, "fields", chromeText(chrome, "noticeFields", "항목"), edit)}</span>
            <br />
            {privacy.collectedFields.join(", ")}
          </p>
          <p>
            <span className="font-semibold text-text-primary">{noticeHeading(privacy, "retention", chromeText(chrome, "noticeRetention", "보유 기간"), edit)}</span>
            <br />
            {privacy.retentionDescription}
          </p>
          {showOperator ? (
            <p>
              <span className="font-semibold text-text-primary">{noticeHeading(privacy, "operator", chromeText(chrome, "noticeOperator", "시스템 운영"), edit)}</span>
              <br />
              {operator}. {noticeHeading(privacy, "operatorNote", chromeText(chrome, "noticeOperatorNote", "상담과 개인정보 이용의 주체는 위에 적은 수집 주체입니다."), edit)}
            </p>
          ) : null}
          {privacy.thirdPartyProvisionEnabled ? (
            <p>
              <span className="font-semibold text-text-primary">{noticeHeading(privacy, "thirdParty", chromeText(chrome, "noticeThird", "제3자 제공"), edit)}</span>
              <br />
              {thirdLine}.
            </p>
          ) : null}
          <p>
            <span className="font-semibold text-text-primary">{noticeHeading(privacy, "refusal", chromeText(chrome, "noticeRefusal", "동의 거부"), edit)}</span>
            <br />
            {privacy.refusalConsequence}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="mt-6 inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("[contenteditable='true'], [role='textbox']")) return;
            onClose();
          }}
        >
          <span className="text-white">{noticeHeading(privacy, "close", chromeText(chrome, "shellPopupClosePh", "닫기"), edit)}</span>
        </button>
      </div>
    </div>
  );
}
