"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { safeNextPath } from "@/lib/auth/safe-next";
import { orgText } from "@/modules/admin/org-copy";

function LoginFields({ brandName }: { brandName: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState(params.get("error") === "suspended" ? orgText("suspended") : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const loginId = String(form.get("loginId") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!loginId || !password) {
      setError(orgText("loginInvalid"));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.message) {
          setError(json.message);
        } else if (json.code === "RATE_LIMITED") {
          const retryAfter = Number(res.headers.get("Retry-After") || 60);
          const minutes = Math.max(1, Math.ceil(retryAfter / 60));
          setError(orgText("loginRateLimited").replace("{minutes}", String(minutes)));
        } else {
          setError(orgText("loginFail"));
        }
        return;
      }
      router.push(safeNextPath(params.get("next")));
      router.refresh();
    } catch {
      setError(orgText("loginFail"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 ui-card">
        <div>
          <p className="text-sm font-medium text-primary">{brandName}</p>
          <h1 className="mt-2 text-2xl font-bold">{orgText("loginTitle")}</h1>
          <p className="mt-1 text-sm text-text-body">{orgText("loginBody")}</p>
        </div>
        <Field label={orgText("loginId")}>
          <Input name="loginId" type="text" autoComplete="username" required autoFocus data-testid="login-id" />
        </Field>
        <Field label={orgText("password")}>
          <Input name="password" type="password" autoComplete="current-password" required data-testid="login-password" />
        </Field>
        {error ? (
          <p className="text-sm text-danger" role="alert" aria-live="assertive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" loading={loading} data-testid="login-submit">
          {orgText("login")}
        </Button>
        <a href="/reset-password" className="block text-center text-sm text-text-body">
          {orgText("resetPassword")}
        </a>
        <p className="flex justify-center gap-4 text-sm text-text-muted">
          <a href="/privacy">{orgText("privacyTitle")}</a>
          <a href="/terms">{orgText("termsTitle")}</a>
        </p>
      </form>
    </div>
  );
}

export function LoginForm({ brandName }: { brandName: string }) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-muted">{orgText("loginLoading")}</div>}>
      <LoginFields brandName={brandName} />
    </Suspense>
  );
}
