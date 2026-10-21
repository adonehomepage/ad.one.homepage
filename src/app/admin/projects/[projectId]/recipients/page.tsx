"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Badge, badgeLabels } from "@/components/ui/badge";
import { formatPhoneInput } from "@/lib/validation/phone";

type Recipient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferredChannel: string;
  verificationStatus: string;
  isActive: boolean;
};

export default function RecipientsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [items, setItems] = useState<Recipient[]>([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [disableId, setDisableId] = useState<string | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [phone, setPhone] = useState("");
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const text = (key: string, fallback: string) => String(settings[key] ?? "").trim() || fallback;

  useEffect(() => {
    params.then(async ({ projectId: id }) => {
      setProjectId(id);
      const res = await fetch(`/api/projects/${id}/recipients`);
      const json = await res.json();
      setItems(json.recipients ?? []);
      const draftRes = await fetch(`/api/projects/${id}/draft`);
      const draftJson = await draftRes.json();
      setSettings((draftJson.draft?.globalSettings ?? {}) as Record<string, unknown>);
    });
  }, [params]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    try {
      const res = await fetch(`/api/projects/${projectId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          companyName: form.get("companyName"),
          phone: phone || form.get("phone"),
          email: form.get("email"),
          preferredChannel: form.get("preferredChannel"),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage(json.message ?? text("shellRecipientFail", "수신자를 등록하지 못했습니다."));
        return;
      }
      setIsError(false);
      setMessage(
        json.verifyUrl
          ? text("shellRecipientVerify", "인증 링크(샌드박스): {url}").replace("{url}", String(json.verifyUrl))
          : text("shellRecipientAdded", "수신자를 등록했습니다. 인증 후 개인정보가 발송됩니다."),
      );
      setPhone("");
      formEl.reset();
      const list = await fetch(`/api/projects/${projectId}/recipients`);
      setItems((await list.json()).recipients ?? []);
    } catch {
      setIsError(true);
      setMessage(text("shellRecipientFail", "수신자를 등록하지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }

  async function disableRecipient() {
    if (!disableId) return;
    setDisabling(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/recipients/${disableId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setIsError(true);
        setMessage(json.message ?? text("shellRecipientFail", "수신자를 등록하지 못했습니다."));
        return;
      }
      const list = await fetch(`/api/projects/${projectId}/recipients`);
      setItems((await list.json()).recipients ?? []);
    } catch {
      setIsError(true);
      setMessage(text("shellRecipientFail", "수신자를 등록하지 못했습니다."));
    } finally {
      setDisabling(false);
      setDisableId(null);
    }
  }

  const pendingName = items.find((item) => item.id === disableId)?.name ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{text("shellRecipients", "광고주 수신자")}</h1>
        <p className="mt-2 text-sm text-text-body">
          {text("shellRecipientsBody", "활성 수신자는 최대 5명입니다. 인증되지 않은 연락처에는 관심고객 개인정보를 보내지 않습니다.")}
        </p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3 ui-card md:grid-cols-2">
        <Field label={text("shellRecipientName", "이름")}>
          <Input name="name" required data-testid="recipient-name" />
        </Field>
        <Field label={text("shellRecipientCompany", "회사명")}>
          <Input name="companyName" />
        </Field>
        <Field label={text("shellRecipientPhone", "휴대전화")}>
          <Input
            name="phone"
            inputMode="tel"
            placeholder="010-0000-0000"
            value={phone}
            onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
            data-testid="recipient-phone"
          />
        </Field>
        <Field label={text("shellRecipientEmail", "이메일")}>
          <Input name="email" type="email" data-testid="recipient-email" />
        </Field>
        <Field label={text("shellRecipientChannel", "알림 채널")}>
          <select name="preferredChannel" defaultValue="KAKAO_ALIMTALK" className="ui-field" data-testid="recipient-channel">
            <option value="KAKAO_ALIMTALK">{text("shellChannelKakao", "카카오 알림톡")}</option>
            <option value="EMAIL">{text("shellChannelEmail", "이메일")}</option>
          </select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" loading={loading} data-testid="recipient-add">
            {text("shellRecipientAdd", "수신자 등록")}
          </Button>
        </div>
      </form>
      {message ? (
        <p
          className={`text-sm ${isError ? "text-danger" : "text-text-body"}`}
          role={isError ? "alert" : "status"}
          aria-live={isError ? "assertive" : "polite"}
          data-testid="recipient-message"
        >
          {message}
        </p>
      ) : null}
      <div className="space-y-2">
        {items.length === 0 ? (
          <EmptyState
            title={text("shellRecipientsEmptyTitle", "수신자가 없습니다")}
            description={text("shellRecipientsEmpty", "등록된 수신자가 없습니다.")}
          />
        ) : null}
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between ui-card">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-text-muted">
                {{ EMAIL: text("shellChannelEmail", "이메일"), KAKAO_ALIMTALK: text("shellChannelKakao", "카카오 알림톡") }[
                  item.preferredChannel
                ] ?? item.preferredChannel}{" "}
                · {item.phone || item.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge value={item.verificationStatus === "VERIFIED" ? "ACTIVE" : "INVITED"} labels={badgeLabels(settings)} />
              {!item.isActive ? <Badge value="PAUSED" labels={badgeLabels(settings)} /> : null}
              {item.isActive ? (
                <Button variant="ghost" type="button" onClick={() => setDisableId(item.id)}>
                  {text("shellRecipientDisable", "비활성화")}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(disableId)}
        title={text("shellRecipientDisable", "비활성화")}
        description={text("shellRecipientDisableConfirm", "{name} 수신자를 비활성화할까요?").replace("{name}", pendingName)}
        danger
        loading={disabling}
        onCancel={() => setDisableId(null)}
        onConfirm={() => void disableRecipient()}
      />
    </div>
  );
}
