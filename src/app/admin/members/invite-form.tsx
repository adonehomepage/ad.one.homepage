"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function InviteForm() {
  const [message, setMessage] = useState("");
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        role: form.get("role"),
      }),
    });
    const json = await res.json();
    setMessage(res.ok ? json.inviteUrl ?? "초대를 발송했습니다." : json.message);
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl bg-white p-5 md:grid-cols-4">
      <Field label="이름">
        <Input name="name" required />
      </Field>
      <Field label="이메일">
        <Input name="email" type="email" required />
      </Field>
      <Field label="역할">
        <select name="role" className="h-11 w-full rounded-lg border border-border px-3">
          <option value="MEMBER">직원</option>
          <option value="SYSTEM_ADMIN">시스템 관리자</option>
        </select>
      </Field>
      <div className="flex items-end">
        <Button type="submit">초대</Button>
      </div>
      {message ? <p className="md:col-span-4 text-sm text-text-body">{message}</p> : null}
    </form>
  );
}
