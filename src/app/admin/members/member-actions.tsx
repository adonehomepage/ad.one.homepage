"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { orgText } from "@/modules/admin/org-copy";

type Pending = "suspend" | "demote" | "promote" | "reactivate" | null;

export function MemberActions({
  memberId,
  status,
  role,
}: {
  memberId: string;
  status: string;
  role: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending>(null);

  async function post(action?: string, body?: unknown) {
    setLoading(true);
    setError("");
    try {
      const url = action ? `/api/members/${memberId}?action=${action}` : `/api/members/${memberId}`;
      const res = await fetch(url, {
        method: action ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.message ?? orgText("requestFailed"));
        return;
      }
      router.refresh();
    } catch {
      setError(orgText("requestFailed"));
    } finally {
      setLoading(false);
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1">
        {status === "ACTIVE" ? (
          <Button variant="danger" type="button" loading={loading} onClick={() => setPending("suspend")}>
            {orgText("suspend")}
          </Button>
        ) : (
          <Button variant="soft" type="button" loading={loading} onClick={() => setPending("reactivate")}>
            {orgText("reactivate")}
          </Button>
        )}
        {role === "SYSTEM_ADMIN" ? (
          <Button variant="ghost" type="button" loading={loading} onClick={() => setPending("demote")}>
            {orgText("demote")}
          </Button>
        ) : (
          <Button variant="ghost" type="button" loading={loading} onClick={() => setPending("promote")}>
            {orgText("promote")}
          </Button>
        )}
      </div>
      {error ? (
        <span className="text-xs text-danger" role="alert" aria-live="assertive">
          {error}
        </span>
      ) : null}
      <ConfirmDialog
        open={pending === "suspend"}
        title={orgText("suspend")}
        description={orgText("suspendConfirm")}
        danger
        loading={loading}
        onCancel={() => setPending(null)}
        onConfirm={() => void post("suspend")}
      />
      <ConfirmDialog
        open={pending === "reactivate"}
        title={orgText("reactivate")}
        description={orgText("reactivateConfirm")}
        loading={loading}
        onCancel={() => setPending(null)}
        onConfirm={() => void post("reactivate")}
      />
      <ConfirmDialog
        open={pending === "demote"}
        title={orgText("demote")}
        description={orgText("demoteConfirm")}
        loading={loading}
        onCancel={() => setPending(null)}
        onConfirm={() => void post(undefined, { role: "MEMBER" })}
      />
      <ConfirmDialog
        open={pending === "promote"}
        title={orgText("promote")}
        description={orgText("promoteConfirm")}
        loading={loading}
        onCancel={() => setPending(null)}
        onConfirm={() => void post(undefined, { role: "SYSTEM_ADMIN" })}
      />
    </div>
  );
}
