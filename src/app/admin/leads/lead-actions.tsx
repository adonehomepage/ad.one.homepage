"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function LeadNoteForm({ leadId }: { leadId: string }) {
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message ?? "메모를 저장하지 못했습니다.");
      return;
    }
    setContent("");
    window.location.reload();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="상담 메모. 상태 단계는 관리하지 않습니다." />
      <Button type="submit">메모 추가</Button>
      {message ? <p className="text-sm text-danger">{message}</p> : null}
    </form>
  );
}

export function ExportLeadsButton({ projectId }: { projectId: string }) {
  async function download() {
    const res = await fetch(`/api/projects/${projectId}/leads/export`);
    const json = await res.json();
    if (!res.ok || !json.csv) return;
    const blob = new Blob([json.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${projectId}.csv`;
    a.click();
  }
  return (
    <Button variant="soft" type="button" onClick={download}>
      CSV 내보내기
    </Button>
  );
}
