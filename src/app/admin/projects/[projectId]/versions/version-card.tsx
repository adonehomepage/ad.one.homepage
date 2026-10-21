"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LandingPage } from "@/modules/templates/render/landing-page";
import { RestoreButton } from "@/app/admin/projects/[projectId]/versions/restore-button";
import type { PageSnapshot } from "@/types";

export function VersionCard({
  projectId,
  versionId,
  versionNumber,
  publishedLabel,
  changeSummary,
  snapshot,
  settings,
}: {
  projectId: string;
  versionId: string;
  versionNumber: number;
  publishedLabel: string;
  changeSummary: string;
  snapshot: PageSnapshot;
  settings: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false);
  const text = (key: string, fallback: string) => String(settings[key] ?? "").trim() || fallback;
  const note = changeSummary.trim() || text("shellVersionEmptyNote", "메모 없음");
  return (
    <div className="ui-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold">{text("shellVersionName", "버전 {count}").replace("{count}", String(versionNumber))}</p>
          <p className="mt-1 text-sm text-text-muted">
            {publishedLabel} · {note}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" data-testid="version-preview-toggle" onClick={() => setOpen((value) => !value)}>
            {open ? text("shellVersionClose", "미리보기 닫기") : text("shellVersionOpen", "이 버전 보기")}
          </Button>
          <RestoreButton projectId={projectId} versionId={versionId} settings={settings} />
        </div>
      </div>
      {open ? (
        <div className="h-[32rem] overflow-auto rounded-[16px] border border-border bg-white">
          <LandingPage snapshot={snapshot} mode="preview" />
        </div>
      ) : null}
    </div>
  );
}
