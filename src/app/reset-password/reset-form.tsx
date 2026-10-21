"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { validatePasswordStrength } from "@/lib/auth/password-rules";
import { orgText } from "@/modules/admin/org-copy";

export function ResetForm({ brandName }: { brandName: string }) {
  const params = useSearchParams();
  const token = params.get("token");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResetUrl("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    if (token) {
      const strength = validatePasswordStrength(String(form.get("password") ?? ""));
      if (strength) {
        setLoading(false);
        setMessage(strength);
        setDone(false);
        return;
      }
    }
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(token ? { token, password: form.get("password") } : { email: form.get("email") }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.message ?? orgText("requestFailed"));
        setDone(false);
        return;
      }
      if (token) {
        setMessage(orgText("resetCompleteOk"));
        setDone(true);
        return;
      }
      if (json.resetUrl) {
        setResetUrl(String(json.resetUrl));
      }
      setMessage(orgText("resetOk"));
      setDone(true);
    } catch {
      setMessage(orgText("requestFailed"));
      setDone(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 ui-card">
        <div>
          <p className="text-sm font-medium text-primary">{brandName}</p>
          <h1 className="mt-2 text-2xl font-bold">{token ? orgText("resetNewTitle") : orgText("resetTitle")}</h1>
        </div>
        {token ? (
          <Field label={orgText("resetNewPassword")} hint={orgText("invitePasswordHint")}>
            <Input name="password" type="password" autoComplete="new-password" required data-testid="reset-password" />
          </Field>
        ) : (
          <Field label={orgText("resetEmail")} hint={orgText("resetEmailHint")}>
            <Input name="email" type="email" autoComplete="email" required data-testid="reset-email" />
          </Field>
        )}
        {message ? (
          <p
            className={done ? "text-sm text-text-body" : "text-sm text-danger"}
            role={done ? "status" : "alert"}
            aria-live="polite"
            data-testid="reset-message"
          >
            {message}
          </p>
        ) : null}
        {resetUrl ? (
          <p className="break-all text-sm text-text-body" data-testid="reset-sandbox-link">
            {orgText("resetSandboxLink")}:{" "}
            <a href={resetUrl} className="font-semibold text-primary underline">
              {resetUrl}
            </a>
          </p>
        ) : null}
        {done ? (
          <Link href="/login" className="block text-center text-sm font-semibold text-primary">
            {orgText("login")}
          </Link>
        ) : null}
        {token && message && !done ? (
          <Link href="/reset-password" className="block text-center text-sm font-semibold text-primary" data-testid="reset-request-again">
            {orgText("resetRequestAgain")}
          </Link>
        ) : null}
        <Button type="submit" className="w-full" loading={loading} data-testid="reset-submit">
          {orgText("resetSubmit")}
        </Button>
      </form>
    </div>
  );
}
