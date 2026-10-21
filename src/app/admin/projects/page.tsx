import Link from "next/link";
import { listProjects } from "@/modules/projects/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatSeoulDate } from "@/lib/datetime";
import { daysUntil } from "@/lib/datetime";
import { appConfig } from "@/lib/config";
import { CopyUrlButton } from "@/components/ui/copy-url-button";
import { orgText } from "@/modules/admin/org-copy";
import { cn } from "@/lib/cn";

const STATUS_FILTERS = [
  { value: "", labelKey: "filterAll" as const },
  { value: "PUBLISHED", labelKey: "badgePublished" as const },
  { value: "DRAFT", labelKey: "badgeDraft" as const },
  { value: "PAUSED", labelKey: "badgePaused" as const },
  { value: "EXPIRED", labelKey: "badgeExpired" as const },
  { value: "PENDING_DELETION", labelKey: "badgePending" as const },
];

function projectsQuery(params: { q?: string; status?: string; expiring?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.status) query.set("status", params.status);
  if (params.expiring === "1") query.set("expiring", "1");
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `/admin/projects?${qs}` : "/admin/projects";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; expiring?: string; page?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const { items, page: currentPage, limit } = await listProjects({
    organizationId: ctx.organization.id,
    q: params.q,
    status: params.status,
    expiringSoon: params.expiring === "1",
    page,
  });
  const hasPrev = currentPage > 1;
  const hasNext = items.length === limit;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{orgText("navProjects")}</h1>
          <p className="mt-1 text-sm text-text-body">{orgText("projectsBody")}</p>
        </div>
        <Link href="/admin/projects/new">
          <Button data-testid="create-project-nav">{orgText("createProject")}</Button>
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => {
          const active = (params.status ?? "") === filter.value && params.expiring !== "1";
          const href = filter.value ? `/admin/projects?status=${filter.value}` : "/admin/projects";
          return (
            <Link
              key={filter.labelKey}
              href={href}
              className={cn(
                "inline-flex h-12 items-center rounded-[14px] border px-4 text-[17px] font-semibold",
                active ? "border-primary bg-primary-soft text-primary" : "border-border bg-white text-text-body",
              )}
            >
              {orgText(filter.labelKey)}
            </Link>
          );
        })}
        <Link
          href="/admin/projects?expiring=1"
          className={cn(
            "inline-flex h-12 items-center rounded-[14px] border px-4 text-[17px] font-semibold",
            params.expiring === "1" ? "border-primary bg-primary-soft text-primary" : "border-border bg-white text-text-body",
          )}
        >
          {orgText("cardExpiring")}
        </Link>
      </div>
      <form className="flex gap-2">
        <Input name="q" defaultValue={params.q} placeholder={orgText("projectSearch")} aria-label={orgText("searchAriaLabel")} className="min-w-0 flex-1" />
        {params.status ? <input type="hidden" name="status" value={params.status} /> : null}
        {params.expiring === "1" ? <input type="hidden" name="expiring" value="1" /> : null}
        <Button variant="ghost" type="submit">
          {orgText("search")}
        </Button>
      </form>
      {items.length === 0 ? (
        <EmptyState
          title={orgText("projectsEmptyTitle")}
          description={orgText("projectsEmptyBody")}
          action={
            <Link href="/admin/projects/new">
              <Button>{orgText("createProject")}</Button>
            </Link>
          }
        />
      ) : (
        <div className="ui-table">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">{orgText("colProject")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colUrl")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colStatus")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colExpires")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colLeads")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colAction")}</th>
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
                    {project.publishedAt ? (
                      <div className="flex items-center gap-2">
                        <span>{project.publicSlug}</span>
                        <CopyUrlButton url={`${appConfig.publicUrl}/${project.publicSlug}`} label={orgText("copy")} copiedLabel={orgText("copied")} />
                      </div>
                    ) : (
                      <span className="text-text-muted">{orgText("urlAfterPublish")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={project.status} />
                    {project.hasUnpublishedChanges ? <p className="text-xs text-primary">{orgText("unpublishedChanges")}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    {project.expiresAt
                      ? orgText("expiresFormat")
                          .replace("{date}", formatSeoulDate(project.expiresAt))
                          .replace("{days}", String(daysUntil(project.expiresAt)))
                      : orgText("expiresNone")}
                  </td>
                  <td className="px-4 py-3">{Number(leadCount)}</td>
                  <td className="px-4 py-3">
                    <Link className="text-primary" href={`/admin/projects/${project.id}/editor`}>
                      {orgText("edit")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hasPrev || hasNext ? (
        <div className="flex items-center justify-between gap-3">
          {hasPrev ? (
            <Link
              href={projectsQuery({ q: params.q, status: params.status, expiring: params.expiring, page: currentPage - 1 })}
              className="text-[17px] font-semibold text-primary"
            >
              {orgText("pagePrev")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-text-muted">{orgText("pageStatus").replace("{page}", String(currentPage))}</span>
          {hasNext ? (
            <Link
              href={projectsQuery({ q: params.q, status: params.status, expiring: params.expiring, page: currentPage + 1 })}
              className="text-[17px] font-semibold text-primary"
            >
              {orgText("pageNext")}
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
      <p className="text-xs text-text-muted">{orgText("publicAddress").replace("{url}", appConfig.publicUrl)}</p>
    </div>
  );
}
