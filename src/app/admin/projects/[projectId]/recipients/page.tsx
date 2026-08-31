"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    params.then(async ({ projectId: id }) => {
      setProjectId(id);
      const res = await fetch(`/api/projects/${id}/recipients`);
      const json = await res.json();
      setItems(json.recipients ?? []);
    });
  }, [params]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch(`/api/projects/${projectId}/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        companyName: form.get("companyName"),
        phone: form.get("phone"),
        email: form.get("email"),
        preferredChannel: form.get("preferredChannel"),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message);
      return;
    }
    setMessage(json.verifyUrl ? `인증 링크(로컬): ${json.verifyUrl}` : "수신자를 등록했습니다. 인증 후 개인정보가 발송됩니다.");
    const list = await fetch(`/api/projects/${projectId}/recipients`);
    setItems((await list.json()).recipients ?? []);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">광고주 수신자</h1>
        <p className="mt-2 text-sm text-text-body">활성 수신자는 최대 5명입니다. 인증되지 않은 연락처에는 관심고객 개인정보를 보내지 않습니다.</p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl bg-white p-6 md:grid-cols-2">
        <Field label="이름">
          <Input name="name" required />
        </Field>
        <Field label="회사명">
          <Input name="companyName" />
        </Field>
        <Field label="휴대전화">
          <Input name="phone" />
        </Field>
        <Field label="이메일">
          <Input name="email" type="email" />
        </Field>
        <Field label="알림 채널">
          <select name="preferredChannel" defaultValue="KAKAO_ALIMTALK" className="h-11 w-full rounded-lg border border-border px-3">
            <option value="KAKAO_ALIMTALK">카카오 알림톡</option>
            <option value="EMAIL">이메일</option>
          </select>
        </Field>
        <div className="flex items-end">
          <Button type="submit">수신자 등록</Button>
        </div>
      </form>
      {message ? <p className="text-sm text-text-body">{message}</p> : null}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-text-muted">
                {item.preferredChannel} · {item.phone || item.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge value={item.verificationStatus === "VERIFIED" ? "ACTIVE" : "INVITED"} />
              {!item.isActive ? <Badge value="PAUSED" /> : null}
              {item.isActive ? (
                <Button
                  variant="ghost"
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/projects/${projectId}/recipients/${item.id}`, { method: "DELETE" });
                    const list = await fetch(`/api/projects/${projectId}/recipients`);
                    setItems((await list.json()).recipients ?? []);
                  }}
                >
                  비활성화
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
