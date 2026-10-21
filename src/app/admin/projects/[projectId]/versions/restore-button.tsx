"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function RestoreButton({ projectId, versionId, settings }: { projectId: string; versionId: string; settings: Record<string, unknown> }) {
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<"restore" | "republish" | null>(null);
  const text = (key: string, fallback: string) => String(settings[key] ?? "").trim() || fallback;

  async function restore(republish: boolean) {
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch(`/api/projects/${projectId}/versions/${versionId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ republish }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage(json.message ?? text("shellActionFail", "처리에 실패했습니다."));
        return;
      }
      const base = republish
        ? text("shellVersionRepublished", "복구 후 재발행했습니다.")
        : text("shellVersionRestored", "작업본으로 가져왔습니다. 편집 화면을 다시 열면 이 버전이 보입니다.");
      const hint = text("shellVersionRefreshHint", "열려 있는 편집 화면이 있으면 새로고침해 주세요.");
      setIsError(false);
      setMessage(`${base} ${hint}`);
    } catch {
      setIsError(true);
      setMessage(text("shellActionFail", "처리에 실패했습니다."));
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" loading={busy} data-testid="version-restore" onClick={() => setPending("restore")}>
        {text("shellVersionRestore", "작업본으로 복구")}
      </Button>
      <Button loading={busy} data-testid="version-republish" onClick={() => setPending("republish")}>
        {text("shellVersionRepublish", "복구 후 재발행")}
      </Button>
      <Link href={`/admin/projects/${projectId}/editor`} className="text-sm font-semibold text-primary" data-testid="version-open-editor">
        {text("shellVersionOpenEditor", "편집 열기")}
      </Link>
      {message ? (
        <span
          className={`text-sm ${isError ? "text-danger" : "text-text-body"}`}
          role={isError ? "alert" : "status"}
          aria-live={isError ? "assertive" : "polite"}
          data-testid="version-restore-message"
        >
          {message}
        </span>
      ) : null}
      <ConfirmDialog
        open={pending === "restore"}
        title={text("shellVersionRestore", "작업본으로 복구")}
        description={text(
          "shellVersionRestoreConfirm",
          "이 버전으로 작업본을 바꿉니다. 공개 페이지는 그대로입니다. 편집 화면에 저장하지 않은 내용은 사라질 수 있습니다.",
        )}
        loading={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void restore(false)}
      />
      <ConfirmDialog
        open={pending === "republish"}
        title={text("shellVersionRepublish", "복구 후 재발행")}
        description={text(
          "shellVersionRepublishConfirm",
          "이 버전으로 작업본을 바꾸고 공개 페이지도 다시 발행합니다. 편집 화면에 저장하지 않은 내용은 사라질 수 있습니다.",
        )}
        loading={busy}
        onCancel={() => setPending(null)}
        onConfirm={() => void restore(true)}
      />
    </div>
  );
}
