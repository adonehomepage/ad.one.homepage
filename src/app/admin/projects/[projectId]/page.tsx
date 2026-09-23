import Link from "next/link";
import { getProject } from "@/modules/projects/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSeoul, formatSeoulDate } from "@/lib/datetime";
import { appConfig } from "@/lib/config";
import { ProjectActions } from "@/app/admin/projects/[projectId]/project-actions";
import { featureFlags } from "@/lib/feature-flags";

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { projectId } = await params;
  const { project, template } = await getProject(ctx.organization.id, projectId);
  const publicUrl = `${appConfig.publicUrl}/${project.publicSlug}`;
  const flags = featureFlags();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="mt-2 text-sm text-text-body">{publicUrl}</p>
        </div>
        <Badge value={project.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/projects/${project.id}/editor`}>
          <Button>편집</Button>
        </Link>
        <Link href={`/admin/projects/${project.id}/versions`}>
          <Button variant="soft">버전 기록</Button>
        </Link>
        <Link href={`/admin/projects/${project.id}/recipients`}>
          <Button variant="ghost">광고주 수신자</Button>
        </Link>
        {flags.leadAdmin ? (
          <Link href={`/admin/projects/${project.id}/leads`}>
            <Button variant="ghost">관심고객</Button>
          </Link>
        ) : null}
        <Link href={`/admin/projects/${project.id}/analytics`}>
          <Button variant="ghost">통계</Button>
        </Link>
      </div>
      <ProjectActions
        projectId={project.id}
        name={project.name}
        status={project.status}
        publicUrl={publicUrl}
        slug={project.publicSlug}
      />
      <dl className="grid gap-4 rounded-2xl bg-white p-6 md:grid-cols-3">
        <div>
          <dt className="text-sm text-text-muted">템플릿</dt>
          <dd className="mt-1 font-medium">{template.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">운영기간</dt>
          <dd className="mt-1 font-medium">{project.durationMonths}개월</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">최초 발행</dt>
          <dd className="mt-1 font-medium">{project.publishedAt ? formatSeoul(project.publishedAt) : "미발행"}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">만료일</dt>
          <dd className="mt-1 font-medium">{project.expiresAt ? formatSeoulDate(project.expiresAt) : "-"}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">최근 수정</dt>
          <dd className="mt-1 font-medium">{formatSeoul(project.updatedAt)}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">미발행 변경</dt>
          <dd className="mt-1 font-medium">{project.hasUnpublishedChanges ? "있음" : "없음"}</dd>
        </div>
      </dl>
    </div>
  );
}
