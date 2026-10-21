"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { isEmail } from "@/lib/validation/phone";
import { orgText } from "@/modules/admin/org-copy";

export function InviteForm() {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const email = String(form.get("email") ?? "").trim();
    if (!isEmail(email)) {
      setLoading(false);
      setIsError(true);
      setMessage(orgText("emailInvalid"));
      return;
    }
    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email,
          role: form.get("role"),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage(json.message ?? orgText("inviteSendFail"));
        return;
      }
      setIsError(false);
      setMessage(json.inviteUrl ? `${orgText("inviteSent")} ${json.inviteUrl}` : orgText("inviteSent"));
      formEl.reset();
    } catch {
      setIsError(true);
      setMessage(orgText("inviteSendFail"));
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-3 ui-card md:grid-cols-4">
      <Field label={orgText("colName")}>
        <Input name="name" autoComplete="name" required data-testid="invite-name" />
      </Field>
      <Field label={orgText("colEmail")}>
        <Input name="email" type="email" autoComplete="email" required data-testid="invite-email" />
      </Field>
      <Field label={orgText("colRole")}>
        <select name="role" className="ui-field" data-testid="invite-role">
          <option value="MEMBER">{orgText("roleMember")}</option>
          <option value="SYSTEM_ADMIN">{orgText("roleAdmin")}</option>
        </select>
      </Field>
      <div className="flex items-end">
        <Button type="submit" loading={loading} data-testid="invite-submit">
          {orgText("invite")}
        </Button>
      </div>
      {message ? (
        <p
          className={`md:col-span-4 text-sm ${isError ? "text-danger" : "text-text-body"}`}
          role={isError ? "alert" : "status"}
          aria-live="polite"
          data-testid="invite-message"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
