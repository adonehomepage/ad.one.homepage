import Link from "next/link";
import { listVersions } from "@/modules/publishing/service";
import { getDraft } from "@/modules/projects/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatSeoul } from "@/lib/datetime";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { VersionCard } from "@/app/admin/projects/[projectId]/versions/version-card";
import type { PageSnapshot } from "@/types";

function versionText(settings: Record<string, unknown>, key: string, fallback: string) {
  return String(settings[key] ?? "").trim() || fallback;
}

export default async function VersionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { projectId } = await params;
  const versions = await listVersions(ctx.organization.id, projectId);
  const draft = await getDraft(ctx.organization.id, projectId).catch(() => null);
  const settings = (draft?.draft.globalSettings ?? {}) as Record<string, unknown>;
  const body = versionText(
    settings,
    "shellVersionsBody",
    "최근 발행 버전 {count}개까지 남습니다. 이 버전 보기는 그때 발행된 화면만 보여 주고, 작업본으로 복구해도 공개 페이지는 바뀌지 않습니다. 복구 후 재발행을 누르면 공개 페이지가 그 버전으로 바뀝니다.",
  ).replace("{count}", String(appConfig.maxPublishedVersions));
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{versionText(settings, "shellVersions", "버전 기록")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-body">{body}</p>
        </div>
        <Link href={`/admin/projects/${projectId}/editor`}>
          <Button variant="soft">{versionText(settings, "shellVersionsBack", "편집으로")}</Button>
        </Link>
      </div>
      {versions.length === 0 ? (
        <EmptyState
          title={versionText(settings, "shellVersionsEmptyTitle", "아직 발행 기록이 없습니다")}
          description={versionText(settings, "shellVersionsEmptyBody", "편집 화면에서 발행하면 여기에 버전과 메모가 쌓입니다.")}
        />
      ) : (
        <div className="space-y-4">
          {versions.map((version) => (
            <VersionCard
              key={version.id}
              projectId={projectId}
              versionId={version.id}
              versionNumber={version.versionNumber}
              publishedLabel={formatSeoul(version.publishedAt)}
              changeSummary={version.changeSummary ?? ""}
              snapshot={version.snapshotJson as PageSnapshot}
              settings={settings}
            />
          ))}
        </div>
      )}
    </div>
  );
}
