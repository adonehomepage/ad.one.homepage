"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        token
          ? { token, password: form.get("password") }
          : { email: form.get("email") },
      ),
    });
    const json = await res.json();
    setMessage(res.ok ? "처리되었습니다. 메일을 확인해 주세요." : json.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8">
        <h1 className="text-2xl font-bold">{token ? "새 비밀번호 설정" : "비밀번호 재설정"}</h1>
        {token ? (
          <Field label="새 비밀번호">
            <Input name="password" type="password" required />
          </Field>
        ) : (
          <Field label="이메일" hint="계정이 있으면 재설정 안내를 보냅니다.">
            <Input name="email" type="email" required />
          </Field>
        )}
        {message ? <p className="text-sm text-text-body">{message}</p> : null}
        <Button type="submit" className="w-full">
          확인
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-muted">불러오는 중...</div>}>
      <ResetForm />
    </Suspense>
  );
}
