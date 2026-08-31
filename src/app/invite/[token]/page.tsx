"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirm")) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: params.token, password: form.get("password") }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.message ?? "초대를 수락하지 못했습니다.");
      return;
    }
    router.push("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 rounded-2xl bg-white p-8">
        <h1 className="text-2xl font-bold">비밀번호 설정</h1>
        <Field label="비밀번호" hint="10자 이상, 영문과 숫자 포함">
          <Input name="password" type="password" required />
        </Field>
        <Field label="비밀번호 확인">
          <Input name="confirm" type="password" required />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" loading={loading}>
          계정 활성화
        </Button>
      </form>
    </div>
  );
}
