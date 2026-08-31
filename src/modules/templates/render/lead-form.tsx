"use client";

import { useRef, useState } from "react";
import type { PageSection, PageSnapshot } from "@/types";
import { trackPublicEvent } from "@/modules/templates/render/tracker";

export function LeadForm({
  snapshot,
  section,
  disabled,
}: {
  snapshot: PageSnapshot;
  section: PageSection;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");
  const started = useRef(false);
  const privacy = snapshot.privacy;

  function onFormStart() {
    if (disabled || started.current) return;
    started.current = true;
    trackPublicEvent(snapshot.publicSlug, "lead_form_start");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    const form = new FormData(event.currentTarget);
    const answers: Record<string, unknown> = {};
    for (const field of snapshot.formSettings.fields) {
      if (field.type === "name" || field.type === "phone") continue;
      answers[field.key] = form.get(field.key);
    }
    const payload = {
      name: String(form.get("name") ?? ""),
      phone: String(form.get("phone") ?? ""),
      website: String(form.get("website") ?? ""),
      answers,
      consents: {
        collection: form.get("collection") === "on",
        thirdParty: form.get("thirdParty") === "on",
      },
      utm: Object.fromEntries(new URLSearchParams(window.location.search)),
      referrer: document.referrer,
    };
    const res = await fetch(`/api/public/projects/${encodeURIComponent(snapshot.publicSlug)}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setStatus("error");
      setMessage(json.message ?? "등록에 실패했습니다.");
      trackPublicEvent(snapshot.publicSlug, "lead_submit_error");
      return;
    }
    trackPublicEvent(snapshot.publicSlug, "lead_submit_success");
    setStatus("ok");
    setMessage(snapshot.formSettings.successMessage || "관심고객 등록이 완료되었습니다.");
    event.currentTarget.reset();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <h2 className="text-3xl font-bold">{String(section.content.heading ?? "관심고객 등록")}</h2>
      <p className="mt-3 text-text-body">{snapshot.formSettings.intro || String(section.content.intro ?? "")}</p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit} onFocus={onFormStart}>
        <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />
        {snapshot.formSettings.fields.filter((field) => field.visible).map((field) => (
          <label key={field.key} className="block space-y-1.5">
            <span className="text-sm font-medium">
              {field.label}
              {field.required ? " *" : ""}
            </span>
            {field.type === "textarea" ? (
              <textarea name={field.key} required={field.required} disabled={disabled} className="min-h-24 w-full rounded-lg border border-border px-3 py-2" />
            ) : field.type === "select" ? (
              <select name={field.key} required={field.required} disabled={disabled} className="h-11 w-full rounded-lg border border-border px-3">
                <option value="">선택</option>
                {(field.options ?? []).map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                name={field.key}
                required={field.required}
                disabled={disabled}
                type={field.type === "phone" ? "tel" : field.type === "date" ? "date" : "text"}
                autoComplete={field.type === "name" ? "name" : field.type === "phone" ? "tel" : "off"}
                className="h-11 w-full rounded-lg border border-border px-3"
              />
            )}
          </label>
        ))}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="collection" required disabled={disabled} className="mt-1" />
          <span>
            [필수] 개인정보 수집 및 이용에 동의합니다. 수집 주체: {privacy.collectingControllerName}. 목적: {privacy.collectionPurpose}. 항목: {privacy.collectedFields.join(", ")}. 기간: {privacy.retentionDescription}.
          </span>
        </label>
        {privacy.thirdPartyProvisionEnabled ? (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="thirdParty" required disabled={disabled} className="mt-1" />
            <span>
              [필수] 개인정보 제3자 제공에 동의합니다. 제공받는 자: {privacy.thirdPartyRecipientName}. 목적: {privacy.thirdPartyPurpose}.
            </span>
          </label>
        ) : null}
        {privacy.collectingControllerName === "처리주체미정" ? (
          <p className="text-sm text-danger">개인정보 처리 주체가 확정되기 전에는 실제 접수가 저장되지 않을 수 있습니다.</p>
        ) : null}
        <button
          type="submit"
          disabled={disabled}
          className="h-12 w-full rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-50"
        >
          등록하기
        </button>
        {status !== "idle" ? (
          <p className={status === "ok" ? "text-sm text-primary-soft-foreground" : "text-sm text-danger"}>{message}</p>
        ) : null}
      </form>
    </div>
  );
}
