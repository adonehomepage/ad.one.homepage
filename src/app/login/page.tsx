"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(params.get("error") === "suspended" ? "정지된 계정입니다." : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginId: form.get("loginId"), password: form.get("password") }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.message ?? "로그인에 실패했습니다.");
      return;
    }
    router.push(params.get("next") || "/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-medium text-primary">브랜드명미정</p>
          <h1 className="mt-2 text-2xl font-bold">직원 로그인</h1>
          <p className="mt-1 text-sm text-text-body">초대받은 광고사 직원만 로그인할 수 있습니다.</p>
        </div>
        <Field label="아이디">
          <Input name="loginId" type="text" autoComplete="username" required data-testid="login-id" />
        </Field>
        <Field label="비밀번호">
          <Input name="password" type="password" autoComplete="current-password" required data-testid="login-password" />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" loading={loading} data-testid="login-submit">
          로그인
        </Button>
        <a href="/reset-password" className="block text-center text-sm text-text-body">
          비밀번호 재설정
        </a>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-muted">불러오는 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
