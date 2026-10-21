"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { isEmail } from "@/lib/validation/phone";
import { orgText } from "@/modules/admin/org-copy";

type Settings = {
  brandName?: string | null;
  legalCompanyName?: string | null;
  kakaoChannelName?: string | null;
  supportEmail?: string | null;
  privacyOfficerName?: string | null;
  privacyContactEmail?: string | null;
  defaultDurationMonths?: number | null;
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    const form = new FormData(event.currentTarget);
    const supportEmail = String(form.get("supportEmail") ?? "").trim();
    const privacyContactEmail = String(form.get("privacyContactEmail") ?? "").trim();
    if (supportEmail && !isEmail(supportEmail)) {
      setLoading(false);
      setIsError(true);
      setMessage(orgText("emailInvalid"));
      return;
    }
    if (privacyContactEmail && !isEmail(privacyContactEmail)) {
      setLoading(false);
      setIsError(true);
      setMessage(orgText("emailInvalid"));
      return;
    }
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: form.get("brandName"),
          legalCompanyName: form.get("legalCompanyName"),
          kakaoChannelName: form.get("kakaoChannelName"),
          supportEmail,
          privacyOfficerName: form.get("privacyOfficerName"),
          privacyContactEmail,
          defaultDurationMonths: Number(form.get("defaultDurationMonths") || 3),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage(json.message ?? orgText("settingsFail"));
        return;
      }
      setIsError(false);
      setMessage(orgText("settingsSaved"));
    } catch {
      setIsError(true);
      setMessage(orgText("settingsFail"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 ui-card md:grid-cols-2">
      <Field label={orgText("brandName")}>
        <Input name="brandName" defaultValue={initial.brandName ?? ""} />
      </Field>
      <Field label={orgText("legalName")} hint={orgText("legalHint")}>
        <Input name="legalCompanyName" defaultValue={initial.legalCompanyName ?? ""} />
      </Field>
      <Field label={orgText("kakaoName")}>
        <Input name="kakaoChannelName" defaultValue={initial.kakaoChannelName ?? ""} />
      </Field>
      <Field label={orgText("durationMonths")}>
        <Input name="defaultDurationMonths" type="number" min={1} defaultValue={initial.defaultDurationMonths ?? 3} />
      </Field>
      <Field label={orgText("supportEmail")}>
        <Input name="supportEmail" type="email" autoComplete="email" defaultValue={initial.supportEmail ?? ""} />
      </Field>
      <Field label={orgText("privacyOfficer")}>
        <Input name="privacyOfficerName" autoComplete="name" defaultValue={initial.privacyOfficerName ?? ""} />
      </Field>
      <Field label={orgText("privacyEmail")}>
        <Input name="privacyContactEmail" type="email" autoComplete="email" defaultValue={initial.privacyContactEmail ?? ""} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" loading={loading} data-testid="settings-save">
          {orgText("saveSettings")}
        </Button>
      </div>
      {message ? (
        <p
          className={`md:col-span-2 text-sm ${isError ? "text-danger" : "text-text-body"}`}
          role={isError ? "alert" : "status"}
          aria-live="polite"
          data-testid="settings-message"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
