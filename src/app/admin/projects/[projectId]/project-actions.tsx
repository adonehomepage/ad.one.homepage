"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { orgText } from "@/modules/admin/org-copy";

type Pending = "pause" | "extend" | "delete" | null;

export function ProjectActions({
  projectId,
  name,
  status,
  published,
  publicUrl,
  slug,
  settings,
}: {
  projectId: string;
  name: string;
  status: string;
  published: boolean;
  publicUrl: string;
  slug: string;
  settings: Record<string, unknown>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [nextSlug, setNextSlug] = useState(slug);
  const text = (key: string, fallback: string) => String(settings[key] ?? "").trim() || fallback;
  const busy = text("shellBusy", "처리 중...");

  async function call(path: string, body?: unknown, okKey?: string, okFallback?: string) {
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage(json.message ?? text("shellActionFail", "처리에 실패했습니다."));
        return;
      }
      setIsError(false);
      setMessage(text(okKey ?? "shellActionOk", okFallback ?? "반영했습니다."));
      router.refresh();
    } catch {
      setIsError(true);
      setMessage(text("shellActionFail", "처리에 실패했습니다."));
    } finally {
      setLoading(false);
      setPending(null);
    }
  }

  async function remove() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: name }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage(json.message ?? text("shellDeleteFail", "삭제에 실패했습니다."));
        return;
      }
      router.push("/admin/projects");
      router.refresh();
    } catch {
      setIsError(true);
      setMessage(text("shellDeleteFail", "삭제에 실패했습니다."));
    } finally {
      setLoading(false);
      setPending(null);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setIsError(true);
      setMessage(orgText("copyFail"));
    }
  }

  async function saveSlug() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicSlug: nextSlug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        setMessage(json.message ?? text("shellActionFail", "처리에 실패했습니다."));
        return;
      }
      setIsError(false);
      setMessage(orgText("slugUpdated"));
      router.refresh();
    } catch {
      setIsError(true);
      setMessage(text("shellActionFail", "처리에 실패했습니다."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ui-card divide-y divide-border !p-0">
      {!published ? (
        <div className="flex flex-wrap items-center gap-3 px-5 py-3">
          <span className="w-24 shrink-0 text-sm text-text-muted">{text("shellPublicSlug", "공개 URL")}</span>
          <div className="min-w-[12rem] max-w-md flex-1">
            <Input value={nextSlug} onChange={(event) => setNextSlug(event.target.value)} aria-label={text("shellPublicSlug", "공개 URL")} />
          </div>
          <Button
            variant="soft"
            type="button"
            loading={loading}
            loadingLabel={busy}
            disabled={!nextSlug.trim() || nextSlug === slug}
            onClick={() => void saveSlug()}
          >
            {text("shellSlugSave", "URL 저장")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <Button variant="ghost" type="button" aria-live="polite" onClick={() => void copyUrl()}>
            {copied ? text("shellCopied", "복사됨") : text("shellProjectCopyUrl", "URL 복사")}
          </Button>
          {status === "PUBLISHED" ? (
            <a href={`/${slug}`} target="_blank" rel="noreferrer">
              <Button variant="ghost" type="button">
                {text("shellPublicPage", "공개 페이지")}
              </Button>
            </a>
          ) : null}
          {status === "PUBLISHED" ? (
            <Button
              variant="ghost"
              type="button"
              data-testid="project-pause"
              loading={loading}
              loadingLabel={busy}
              onClick={() => setPending("pause")}
            >
              {text("shellPause", "즉시 비공개")}
            </Button>
          ) : null}
          {status === "PAUSED" || status === "EXPIRED" ? (
            <Button
              variant="soft"
              type="button"
              data-testid="project-resume"
              loading={loading}
              loadingLabel={busy}
              onClick={() => call(`/api/projects/${projectId}/resume`, undefined, "shellResumeOk", "다시 공개했습니다.")}
            >
              {text("shellResume", "재공개")}
            </Button>
          ) : null}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3">
        <span className="w-24 shrink-0 text-sm text-text-muted">{text("shellExtendLabel", "연장(개월)")}</span>
        <div className="w-20">
          <Input
            type="number"
            min={1}
            max={120}
            value={months}
            onChange={(event) => setMonths(Math.max(1, Math.min(120, Number(event.target.value) || 1)))}
            data-testid="project-extend-months"
          />
        </div>
        <Button
          type="button"
          variant="soft"
          loading={loading}
          loadingLabel={busy}
          data-testid="project-extend"
          onClick={() => setPending("extend")}
        >
          {text("shellExtend", "기간 연장")}
        </Button>
        <div className="ml-auto">
          <Button type="button" variant="ghost" className="text-danger" loading={loading} loadingLabel={busy} onClick={() => setPending("delete")}>
            {text("editRemove", "삭제")}
          </Button>
        </div>
      </div>
      {status === "EXPIRED" ? (
        <p className="px-5 py-3 text-sm text-text-body">{text("shellResumeExpiredHint", "만료된 프로젝트는 기간을 연장한 뒤 재공개할 수 있습니다.")}</p>
      ) : null}
      {message ? (
        <p
          className={`px-5 py-3 text-sm ${isError ? "text-danger" : "text-text-body"}`}
          role={isError ? "alert" : "status"}
          aria-live={isError ? "assertive" : "polite"}
          data-testid="project-action-message"
        >
          {message}
        </p>
      ) : null}
      <ConfirmDialog
        open={pending === "pause"}
        title={text("shellPause", "즉시 비공개")}
        description={text("shellPauseConfirm", "지금 바로 공개를 멈출까요? 방문자가 페이지를 볼 수 없게 됩니다.")}
        loading={loading}
        onCancel={() => setPending(null)}
        onConfirm={() => void call(`/api/projects/${projectId}/pause`, { reason: "manual" }, "shellPauseOk", "즉시 비공개했습니다.")}
      />
      <ConfirmDialog
        open={pending === "extend"}
        title={text("shellExtend", "기간 연장")}
        description={text("shellExtendConfirm", "운영기간을 {count}개월 연장할까요?").replace("{count}", String(months))}
        loading={loading}
        onCancel={() => setPending(null)}
        onConfirm={() =>
          void call(`/api/projects/${projectId}/extend`, { additionalMonths: months }, "shellExtendOk", "기간을 연장했습니다.")
        }
      />
      <ConfirmDialog
        open={pending === "delete"}
        title={text("editRemove", "삭제")}
        description={text("shellDeleteAsk", "이 홈페이지를 삭제할까요? 복구할 수 없습니다.")}
        danger
        loading={loading}
        confirmLabel={orgText("confirmOk")}
        onCancel={() => setPending(null)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
