"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
import { orgText } from "@/modules/admin/org-copy";

export function LeadNoteForm({
  leadId,
  placeholder = orgText("leadNotePlaceholder"),
  addLabel = orgText("leadNoteAdd"),
  failLabel = orgText("leadNoteFail"),
}: {
  leadId: string;
  placeholder?: string;
  addLabel?: string;
  failLabel?: string;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(json.message ?? failLabel);
        return;
      }
      setContent("");
      router.refresh();
    } catch {
      setMessage(failLabel);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label={orgText("leadNoteLabel")}>
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, 4000))}
          placeholder={placeholder}
          maxLength={4000}
          data-testid="lead-note"
        />
      </Field>
      <Button type="submit" loading={loading} data-testid="lead-note-submit">
        {addLabel}
      </Button>
      {message ? (
        <p className="text-sm text-danger" role="alert" aria-live="assertive">
          {message}
        </p>
      ) : null}
    </form>
  );
}

export function ExportLeadsButton({ projectId, label = orgText("leadExportCsv") }: { projectId: string; label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/leads/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.message ?? orgText("exportFail"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${projectId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(orgText("exportFail"));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="soft" type="button" loading={loading} onClick={() => void download()} data-testid="export-leads">
        {label}
      </Button>
      {error ? (
        <span className="text-xs text-danger" role="alert" aria-live="assertive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
