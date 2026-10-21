import Link from "next/link";
import { getDraft, getProject } from "@/modules/projects/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Badge, badgeLabels } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSeoul, formatSeoulDate } from "@/lib/datetime";
import { appConfig } from "@/lib/config";
import { ProjectActions } from "@/app/admin/projects/[projectId]/project-actions";
import { featureFlags } from "@/lib/feature-flags";

function projectText(settings: Record<string, unknown>, key: string, fallback: string) {
  return String(settings[key] ?? "").trim() || fallback;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { projectId } = await params;
  const { project, template } = await getProject(ctx.organization.id, projectId);
  const draft = await getDraft(ctx.organization.id, projectId).catch(() => null);
  const settings = (draft?.draft.globalSettings ?? {}) as Record<string, unknown>;
  const text = (key: string, fallback: string) => projectText(settings, key, fallback);
  const published = Boolean(project.publishedAt);
  const publicUrl = published ? `${appConfig.publicUrl}/${project.publicSlug}` : "";
  const flags = featureFlags();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {published ? <p className="mt-2 text-sm text-text-body">{publicUrl}</p> : null}
          {!published ? (
            <p className="mt-2 text-sm text-text-muted">
              {text("shellPublicUrlPending", "공개 URL은 최초 발행 후에 표시됩니다.")} ({project.publicSlug})
            </p>
          ) : null}
          {project.hasUnpublishedChanges ? (
            <p className="mt-2 text-sm font-medium text-primary" data-testid="unpublished-changes">
              {text("shellUnpublishedHint", "편집본에 아직 발행하지 않은 변경이 있습니다.")}
            </p>
          ) : null}
        </div>
        <Badge value={project.status} labels={badgeLabels(settings)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/admin/projects/${project.id}/editor`}>
          <Button data-testid="open-editor">{text("shellOpenEditor", "편집")}</Button>
        </Link>
        <Link href={`/admin/projects/${project.id}/versions`}>
          <Button variant="soft" data-testid="open-versions">
            {text("shellVersions", "버전 기록")}
          </Button>
        </Link>
        <Link href={`/admin/projects/${project.id}/recipients`}>
          <Button variant="ghost" data-testid="open-recipients">
            {text("shellRecipients", "광고주 수신자")}
          </Button>
        </Link>
        {flags.leadAdmin ? (
          <Link href={`/admin/projects/${project.id}/leads`}>
            <Button variant="ghost" data-testid="open-leads">
              {text("shellLeads", "관심고객")}
            </Button>
          </Link>
        ) : null}
        <Link href={`/admin/projects/${project.id}/analytics`}>
          <Button variant="ghost" data-testid="open-analytics">
            {text("shellAnalytics", "통계")}
          </Button>
        </Link>
      </div>
      <ProjectActions
        projectId={project.id}
        name={project.name}
        status={project.status}
        published={published}
        publicUrl={publicUrl}
        slug={project.publicSlug}
        settings={settings}
      />
      <dl className="grid gap-4 ui-card md:grid-cols-3">
        <div>
          <dt className="text-sm text-text-muted">{text("shellTemplate", "템플릿")}</dt>
          <dd className="mt-1 font-medium">{template.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">{text("shellDuration", "운영기간")}</dt>
          <dd className="mt-1 font-medium">{text("shellMonths", "{count}개월").replace("{count}", String(project.durationMonths))}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">{text("shellFirstPublish", "최초 발행")}</dt>
          <dd className="mt-1 font-medium">{project.publishedAt ? formatSeoul(project.publishedAt) : text("shellUnpublished", "미발행")}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">{text("shellExpires", "만료일")}</dt>
          <dd className="mt-1 font-medium">{project.expiresAt ? formatSeoulDate(project.expiresAt) : "-"}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">{text("shellUpdated", "최근 수정")}</dt>
          <dd className="mt-1 font-medium">{formatSeoul(project.updatedAt)}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">{text("shellUnpublishedChanges", "미발행 변경")}</dt>
          <dd className="mt-1 font-medium">{project.hasUnpublishedChanges ? text("shellHas", "있음") : text("shellMissing", "없음")}</dd>
        </div>
      </dl>
    </div>
  );
}
