"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { orgText } from "@/modules/admin/org-copy";

export function ProjectRowActions({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.message === "string" ? json.message : orgText("requestFailed"));
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError(orgText("requestFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Link className="font-semibold text-primary" href={`/admin/projects/${projectId}/editor`}>
        {orgText("edit")}
      </Link>
      <button type="button" className="text-text-muted hover:text-danger" onClick={() => { setError(""); setOpen(true); }}>
        {orgText("delete")}
      </button>
      {error ? (
        <span className="text-xs text-danger" role="alert">
          {error}
        </span>
      ) : null}
      <ConfirmDialog
        open={open}
        title={orgText("delete")}
        description={orgText("deleteProjectConfirm")}
        danger
        loading={loading}
        onCancel={() => setOpen(false)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
