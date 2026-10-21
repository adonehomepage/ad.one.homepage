import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, notificationJobs, projects } from "@/lib/db/schema";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSeoulDate } from "@/lib/datetime";
import { getOrganizationTrend } from "@/modules/analytics/service";
import { TrendChart } from "@/components/charts/trend-chart";
import { featureFlags } from "@/lib/feature-flags";
import { orgText } from "@/modules/admin/org-copy";

export default async function DashboardPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.organization.id;
  const flags = featureFlags();

  const [published] = await db.select({ value: sql<number>`count(*)` }).from(projects).where(and(eq(projects.organizationId, orgId), eq(projects.status, "PUBLISHED")));
  const [drafts] = await db.select({ value: sql<number>`count(*)` }).from(projects).where(and(eq(projects.organizationId, orgId), eq(projects.status, "DRAFT")));
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [newLeads] = flags.leadAdmin
    ? await db.select({ value: sql<number>`count(*)` }).from(leads).where(and(eq(leads.organizationId, orgId), gte(leads.submittedAt, weekAgo)))
    : [{ value: 0 }];
  const [failed] = await db.select({ value: sql<number>`count(*)` }).from(notificationJobs).where(and(eq(notificationJobs.organizationId, orgId), eq(notificationJobs.status, "FAILED")));
  const [expiring] = await db.select({ value: sql<number>`count(*)` }).from(projects).where(sql`${projects.organizationId} = ${orgId} and ${projects.status} = 'PUBLISHED' and ${projects.expiresAt} <= now() + interval '7 days'`);
  const recentProjects = await db.select().from(projects).where(eq(projects.organizationId, orgId)).orderBy(desc(projects.updatedAt)).limit(5);
  const recentLeads = flags.leadAdmin
    ? await db.select().from(leads).where(eq(leads.organizationId, orgId)).orderBy(desc(leads.submittedAt)).limit(5)
    : [];
  const trend = await getOrganizationTrend(orgId, weekAgo, new Date());

  const cards = [
    { label: orgText("cardPublished"), value: Number(published?.value ?? 0), href: "/admin/projects?status=PUBLISHED" },
    { label: orgText("cardDrafts"), value: Number(drafts?.value ?? 0), href: "/admin/projects?status=DRAFT" },
    ...(flags.leadAdmin
      ? [{ label: orgText("cardLeads"), value: Number(newLeads?.value ?? 0), href: "/admin/leads" }]
      : []),
    { label: orgText("cardFailed"), value: Number(failed?.value ?? 0), href: "/admin/notifications?status=FAILED" },
    { label: orgText("cardExpiring"), value: Number(expiring?.value ?? 0), href: "/admin/projects?expiring=1" },
  ];

  if (recentProjects.length === 0) {
    return (
      <EmptyState
        title={orgText("emptyProjectsTitle")}
        description={orgText("emptyProjectsBody")}
        action={
          <Link href="/admin/projects/new">
            <Button data-testid="first-project">{orgText("firstProject")}</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{orgText("navDashboard")}</h1>
        <p className="mt-2 text-text-body">{orgText("dashboardBody")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="ui-card">
            <p className="text-sm text-text-muted">{card.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{card.value}</p>
          </Link>
        ))}
      </div>
      <div className="ui-card">
        <h2 className="font-semibold">{orgText("trendTitle")}</h2>
        <div className="mt-4">
          <TrendChart data={trend} />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="ui-card">
          <h2 className="font-semibold">{orgText("recentProjects")}</h2>
          <ul className="mt-4 space-y-3">
            {recentProjects.map((project) => (
              <li key={project.id} className="flex justify-between text-sm">
                <Link href={`/admin/projects/${project.id}`}>{project.name}</Link>
                <Badge value={project.status} />
              </li>
            ))}
          </ul>
        </div>
        {flags.leadAdmin ? (
          <div className="ui-card">
            <h2 className="font-semibold">{orgText("recentLeads")}</h2>
            {recentLeads.length === 0 ? (
              <div className="mt-4">
                <EmptyState title={orgText("leadsEmptyTitle")} description={orgText("recentLeadsEmpty")} />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentLeads.map((lead) => (
                  <li key={lead.id} className="flex justify-between text-sm">
                    <Link href={`/admin/leads/${lead.id}`}>{lead.name}</Link>
                    <span className="text-text-muted">{formatSeoulDate(lead.submittedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
