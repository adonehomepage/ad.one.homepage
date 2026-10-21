"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { validatePasswordStrength } from "@/lib/auth/password-rules";
import { orgText } from "@/modules/admin/org-copy";

export function InviteFormClient({ brandName, email = "" }: { brandName: string; email?: string }) {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirm")) {
      setError(orgText("inviteMismatch"));
      return;
    }
    const strength = validatePasswordStrength(password);
    if (strength) {
      setError(strength);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? orgText("inviteFail"));
        return;
      }
      router.push("/admin");
    } catch {
      setError(orgText("inviteFail"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-5 ui-card">
        <div>
          <p className="text-sm font-medium text-primary">{brandName}</p>
          <h1 className="mt-2 text-2xl font-bold">{orgText("inviteTitle")}</h1>
        </div>
        {email ? (
          <Field label={orgText("colEmail")}>
            <Input name="username" type="email" value={email} readOnly autoComplete="username" data-testid="invite-email" />
          </Field>
        ) : null}
        <Field label={orgText("invitePassword")} hint={orgText("invitePasswordHint")}>
          <Input name="password" type="password" autoComplete="new-password" required data-testid="invite-password" />
        </Field>
        <Field label={orgText("inviteConfirm")}>
          <Input name="confirm" type="password" autoComplete="new-password" required data-testid="invite-confirm" />
        </Field>
        {error ? (
          <p className="text-sm text-danger" role="alert" aria-live="assertive" data-testid="invite-error">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" loading={loading} data-testid="invite-activate">
          {orgText("inviteSubmit")}
        </Button>
      </form>
    </div>
  );
}
