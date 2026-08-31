import { listVersions } from "@/modules/publishing/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatSeoul } from "@/lib/datetime";
import { RestoreButton } from "@/app/admin/projects/[projectId]/versions/restore-button";

export default async function VersionsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { projectId } = await params;
  const versions = await listVersions(ctx.organization.id, projectId);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">버전 기록</h1>
        <p className="mt-2 text-sm text-text-body">최근 발행 버전 5개까지 복구할 수 있습니다. 확인 없이 공개본이 바뀌지 않습니다.</p>
      </div>
      <div className="space-y-3">
        {versions.map((version) => (
          <div key={version.id} className="flex items-center justify-between rounded-2xl bg-white p-5">
            <div>
              <p className="font-semibold">버전 {version.versionNumber}</p>
              <p className="text-sm text-text-muted">
                {formatSeoul(version.publishedAt)} · {version.changeSummary}
              </p>
            </div>
            <RestoreButton projectId={projectId} versionId={version.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
