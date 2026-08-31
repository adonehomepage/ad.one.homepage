"use client";

import { Button } from "@/components/ui/button";

export function PdfDownload({ projectId }: { projectId: string }) {
  async function download() {
    const res = await fetch(`/api/projects/${projectId}/reports/pdf`, { method: "POST", body: JSON.stringify({}) });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.pdf";
    a.click();
  }
  return (
    <Button variant="soft" onClick={download}>
      PDF 보고서
    </Button>
  );
}
