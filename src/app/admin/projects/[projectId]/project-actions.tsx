"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProjectActions({
  projectId,
  name,
  status,
  publicUrl,
  slug,
}: {
  projectId: string;
  name: string;
  status: string;
  publicUrl: string;
  slug: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [months, setMonths] = useState(1);

  async function call(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.message ?? "처리에 실패했습니다.");
      return;
    }
    setMessage("반영했습니다.");
    router.refresh();
  }

  async function remove() {
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmName }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(json.message ?? "삭제에 실패했습니다.");
      return;
    }
    router.push("/admin/projects");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5">
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" type="button" onClick={() => navigator.clipboard.writeText(publicUrl)}>
          URL 복사
        </Button>
        {status === "PUBLISHED" ? (
          <a href={`/${slug}`} target="_blank" rel="noreferrer">
            <Button variant="ghost" type="button">
              공개 페이지
            </Button>
          </a>
        ) : null}
        {status === "PUBLISHED" ? (
          <Button variant="ghost" type="button" onClick={() => call(`/api/projects/${projectId}/pause`, { reason: "manual" })}>
            즉시 비공개
          </Button>
        ) : null}
        {status === "PAUSED" || status === "EXPIRED" ? (
          <Button variant="soft" type="button" onClick={() => call(`/api/projects/${projectId}/resume`)}>
            재공개
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          연장(개월)
          <Input type="number" min={1} value={months} onChange={(event) => setMonths(Number(event.target.value))} className="mt-1 w-24" />
        </label>
        <Button type="button" variant="soft" onClick={() => call(`/api/projects/${projectId}/extend`, { additionalMonths: months })}>
          기간 연장
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          삭제 확인(프로젝트명)
          <Input value={confirmName} onChange={(event) => setConfirmName(event.target.value)} className="mt-1" placeholder={name} />
        </label>
        <Button type="button" variant="danger" onClick={remove}>
          삭제
        </Button>
      </div>
      {message ? <p className="text-sm text-text-body">{message}</p> : null}
    </div>
  );
}
