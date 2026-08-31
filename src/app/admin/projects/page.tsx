import Link from "next/link";
import { listProjects } from "@/modules/projects/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatSeoulDate } from "@/lib/datetime";
import { daysUntil } from "@/lib/datetime";
import { appConfig } from "@/lib/config";
import { CopyUrlButton } from "@/components/ui/copy-url-button";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; expiring?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const params = await searchParams;
  const { items } = await listProjects({
    organizationId: ctx.organization.id,
    q: params.q,
    status: params.status,
    expiringSoon: params.expiring === "1",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">홈페이지</h1>
          <p className="mt-1 text-sm text-text-body">같은 조직의 직원이 모든 프로젝트를 공동 관리합니다.</p>
        </div>
        <Link href="/admin/projects/new">
          <Button>홈페이지 만들기</Button>
        </Link>
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={params.q} placeholder="프로젝트명 또는 URL" className="h-11 flex-1 rounded-lg border border-border px-3" />
        <Button variant="ghost" type="submit">
          검색
        </Button>
      </form>
      {items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 홈페이지가 없습니다"
          description="새 프로젝트를 만들거나 필터를 바꿔 보세요."
          action={
            <Link href="/admin/projects/new">
              <Button>홈페이지 만들기</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">프로젝트</th>
                <th className="px-4 py-3 font-medium">URL</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">만료</th>
                <th className="px-4 py-3 font-medium">리드</th>
                <th className="px-4 py-3 font-medium">액션</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ project, templateName, leadCount }) => (
                <tr key={project.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link href={`/admin/projects/${project.id}`} className="font-medium">
                      {project.name}
                    </Link>
                    <p className="text-xs text-text-muted">{templateName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{project.publicSlug}</span>
                      <CopyUrlButton url={`${appConfig.publicUrl}/${project.publicSlug}`} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={project.status} />
                    {project.hasUnpublishedChanges ? <p className="text-xs text-primary">미발행 변경</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    {project.expiresAt ? `${formatSeoulDate(project.expiresAt)} (D-${daysUntil(project.expiresAt)})` : "-"}
                  </td>
                  <td className="px-4 py-3">{Number(leadCount)}</td>
                  <td className="px-4 py-3">
                    <Link className="text-primary" href={`/admin/projects/${project.id}/editor`}>
                      편집
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-text-muted">공개 주소: {appConfig.publicUrl}/[URL텍스트]</p>
    </div>
  );
}
