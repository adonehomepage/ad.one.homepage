"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: form.get("brandName"),
        legalCompanyName: form.get("legalCompanyName"),
        kakaoChannelName: form.get("kakaoChannelName"),
        supportEmail: form.get("supportEmail"),
        privacyOfficerName: form.get("privacyOfficerName"),
        privacyContactEmail: form.get("privacyContactEmail"),
        defaultDurationMonths: Number(form.get("defaultDurationMonths") || 3),
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? "저장했습니다. 실제 법인·채널 정보는 출시 전 확정값을 넣어야 합니다." : json.message);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl bg-white p-6 md:grid-cols-2">
      <Field label="서비스 이름">
        <Input name="brandName" defaultValue={initial.brandName ?? ""} />
      </Field>
      <Field label="법인명" hint="출시 전 확정 필요">
        <Input name="legalCompanyName" defaultValue={initial.legalCompanyName ?? ""} />
      </Field>
      <Field label="카카오 채널명">
        <Input name="kakaoChannelName" defaultValue={initial.kakaoChannelName ?? ""} />
      </Field>
      <Field label="기본 운영기간(개월)">
        <Input name="defaultDurationMonths" type="number" min={1} defaultValue={initial.defaultDurationMonths ?? 3} />
      </Field>
      <Field label="지원 이메일">
        <Input name="supportEmail" type="email" defaultValue={initial.supportEmail ?? ""} />
      </Field>
      <Field label="개인정보 보호 책임자">
        <Input name="privacyOfficerName" defaultValue={initial.privacyOfficerName ?? ""} />
      </Field>
      <Field label="개인정보 문의 이메일">
        <Input name="privacyContactEmail" type="email" defaultValue={initial.privacyContactEmail ?? ""} />
      </Field>
      <div className="flex items-end">
        <Button type="submit">설정 저장</Button>
      </div>
      {message ? <p className="md:col-span-2 text-sm text-text-body">{message}</p> : null}
    </form>
  );
}
