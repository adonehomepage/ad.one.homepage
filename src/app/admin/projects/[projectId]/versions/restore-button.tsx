"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RestoreButton({ projectId, versionId }: { projectId: string; versionId: string }) {
  const [message, setMessage] = useState("");
  async function restore(republish: boolean) {
    const res = await fetch(`/api/projects/${projectId}/versions/${versionId}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ republish }),
    });
    const json = await res.json();
    setMessage(res.ok ? (republish ? "복구 후 재발행했습니다." : "작업본으로 가져왔습니다.") : json.message);
  }
  return (
    <div className="flex gap-2">
      <Button variant="ghost" onClick={() => restore(false)}>
        작업본으로 복구
      </Button>
      <Button onClick={() => restore(true)}>복구 후 재발행</Button>
      {message ? <span className="text-sm text-text-muted">{message}</span> : null}
    </div>
  );
}
