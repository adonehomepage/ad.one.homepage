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
import { orgText } from "@/modules/admin/org-copy";

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

  const facts = [
    [text("shellTemplate", "템플릿"), template.name],
    [text("shellDuration", "운영기간"), text("shellMonths", "{count}개월").replace("{count}", String(project.durationMonths))],
    [text("shellFirstPublish", "최초 발행"), project.publishedAt ? formatSeoul(project.publishedAt) : text("shellUnpublished", "미발행")],
    [text("shellExpires", "만료일"), project.expiresAt ? formatSeoulDate(project.expiresAt) : "-"],
    [text("shellUpdated", "최근 수정"), formatSeoul(project.updatedAt)],
    [text("shellUnpublishedChanges", "미발행 변경"), project.hasUnpublishedChanges ? text("shellHas", "있음") : text("shellMissing", "없음")],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight">{project.name}</h1>
          {published ? <p className="mt-1 truncate text-sm text-text-body">{publicUrl}</p> : null}
          {!published ? (
            <p className="mt-1 text-sm text-text-muted">
              {text("shellPublicUrlPending", "공개 URL은 최초 발행 후에 표시됩니다.")} ({project.publicSlug})
            </p>
          ) : null}
          {project.hasUnpublishedChanges ? (
            <p className="mt-1 text-sm font-medium text-primary" data-testid="unpublished-changes">
              {text("shellUnpublishedHint", "편집본에 아직 발행하지 않은 변경이 있습니다.")}
            </p>
          ) : null}
        </div>
        <Badge value={project.status} labels={badgeLabels(settings)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/admin/projects/${project.id}/editor`}>
          <Button data-testid="open-editor">{orgText("edit")}</Button>
        </Link>
        <Link href={`/admin/projects/${project.id}/versions`} className="ui-chip" data-testid="open-versions">
          {text("shellVersions", "버전 기록")}
        </Link>
        <Link href={`/admin/projects/${project.id}/recipients`} className="ui-chip" data-testid="open-recipients">
          {text("shellRecipients", "광고주 수신자")}
        </Link>
        {flags.leadAdmin ? (
          <Link href={`/admin/projects/${project.id}/leads`} className="ui-chip" data-testid="open-leads">
            {text("shellLeads", "관심고객")}
          </Link>
        ) : null}
        <Link href={`/admin/projects/${project.id}/analytics`} className="ui-chip" data-testid="open-analytics">
          {text("shellAnalytics", "통계")}
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
      <dl className="ui-card grid grid-cols-2 gap-px overflow-hidden bg-border !p-0 sm:grid-cols-3">
        {facts.map(([label, value]) => (
          <div key={label} className="bg-white px-5 py-3">
            <dt className="text-xs text-text-muted">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
