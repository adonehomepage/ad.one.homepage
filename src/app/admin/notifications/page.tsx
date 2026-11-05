import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { RetryButton } from "@/app/admin/notifications/retry-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getAuthContext } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notificationJobs, projects } from "@/lib/db/schema";
import { formatSeoul } from "@/lib/datetime";
import { cn } from "@/lib/cn";
import { orgText } from "@/modules/admin/org-copy";
import { redirect } from "next/navigation";

export const metadata = { title: "알림 로그" };

const PAGE_SIZE = 50;

const STATUS_FILTERS = [
  { value: "", labelKey: "filterAll" as const },
  { value: "FAILED", labelKey: "badgeFailed" as const },
  { value: "SENT", labelKey: "badgeSent" as const },
  { value: "QUEUED", labelKey: "badgeQueued" as const },
];

function channelLabel(channel: string) {
  if (channel === "KAKAO_ALIMTALK") return orgText("channelKakao");
  if (channel === "EMAIL") return orgText("channelEmail");
  return channel;
}

function eventLabel(eventType: string) {
  if (eventType === "LEAD_REGISTERED") return orgText("eventLead");
  if (eventType === "EXPIRY_NOTICE") return orgText("eventExpiry");
  return eventType;
}

function notificationsQuery(params: { status?: string; projectId?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.projectId) query.set("projectId", params.projectId);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const text = query.toString();
  return text ? `/admin/notifications?${text}` : "/admin/notifications";
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; projectId?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const status = STATUS_FILTERS.some((filter) => filter.value === params.status) ? params.status || undefined : undefined;
  const sites = await db
    .select({ id: projects.id, name: projects.name, slug: projects.publicSlug })
    .from(projects)
    .where(eq(projects.organizationId, ctx.organization.id))
    .orderBy(projects.name);
  const knownSite = sites.find((site) => site.id === params.projectId);

  const filters = [eq(notificationJobs.organizationId, ctx.organization.id)];
  if (status) filters.push(eq(notificationJobs.status, status));
  if (knownSite) filters.push(eq(notificationJobs.projectId, knownSite.id));

  const rows = await db
    .select({ job: notificationJobs, projectName: projects.name })
    .from(notificationJobs)
    .leftJoin(projects, eq(projects.id, notificationJobs.projectId))
    .where(and(...filters))
    .orderBy(desc(notificationJobs.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  const hasPrev = page > 1;
  const hasNext = rows.length === PAGE_SIZE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{orgText("navNotifications")}</h1>
        <p className="mt-1 text-sm text-text-body">{orgText("notificationsBody")}</p>
      </div>
      <form className="flex flex-wrap items-center gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <div className="w-full sm:w-56">
          <select name="projectId" defaultValue={knownSite?.id ?? ""} className="ui-field" aria-label={orgText("colProject")}>
            <option value="">{orgText("filterAllSites")}</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} · /{site.slug}
              </option>
            ))}
          </select>
        </div>
        <Button variant="ghost" type="submit">
          {orgText("search")}
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_FILTERS.map((filter) => {
          const active = (status ?? "") === filter.value;
          return (
            <Link
              key={filter.labelKey}
              href={notificationsQuery({ status: filter.value, projectId: knownSite?.id })}
              className={cn("ui-chip", active && "border-primary bg-primary-soft text-primary-soft-foreground")}
            >
              {orgText(filter.labelKey)}
            </Link>
          );
        })}
      </div>
      {rows.length === 0 ? (
        <EmptyState title={orgText("notificationsEmptyTitle")} description={orgText("notificationsEmpty")} />
      ) : (
        <div className="ui-table">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-surface text-text-muted">
              <tr>
                <th className="w-40 px-4 py-3 font-medium">{orgText("colWhen")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colProject")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colKind")}</th>
                <th className="w-28 px-4 py-3 font-medium">{orgText("colChannel")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colStatus")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colNote")}</th>
                <th className="w-24 px-4 py-3 font-medium">{orgText("colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ job, projectName }) => (
                <tr key={job.id} className="border-t border-border">
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted">{formatSeoul(job.createdAt)}</td>
                  <td className="px-4 py-3 font-medium text-text-primary">{projectName ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{eventLabel(job.eventType)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-body">{channelLabel(job.channel)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge value={job.status} />
                  </td>
                  <td className="max-w-56 truncate px-4 py-3 text-text-muted" title={job.errorMessageRedacted ?? undefined}>
                    {job.errorMessageRedacted || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex h-9 items-center">
                      {job.status === "FAILED" ? <RetryButton id={job.id} /> : <span className="text-text-muted">—</span>}
                    </div>
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
            <Link href={notificationsQuery({ status, projectId: knownSite?.id, page: page - 1 })} className="text-sm font-semibold text-primary">
              {orgText("pagePrev")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-text-muted">{orgText("pageStatus").replace("{page}", String(page))}</span>
          {hasNext ? (
            <Link href={notificationsQuery({ status, projectId: knownSite?.id, page: page + 1 })} className="text-sm font-semibold text-primary">
              {orgText("pageNext")}
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
