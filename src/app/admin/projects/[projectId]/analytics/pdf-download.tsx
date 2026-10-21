"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { orgText } from "@/modules/admin/org-copy";

export function PdfDownload({ projectId, label, days = 7 }: { projectId: string; label: string; days?: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setLoading(true);
    setError("");
    try {
      const to = new Date();
      const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
      const res = await fetch(`/api/projects/${projectId}/reports/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: from.toISOString(), to: to.toISOString() }),
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
      a.download = "report.pdf";
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
      <Button variant="soft" loading={loading} onClick={() => void download()} data-testid="pdf-download">
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
