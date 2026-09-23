import Link from "next/link";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { leads, notificationJobs, projects } from "@/lib/db/schema";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatSeoulDate } from "@/lib/datetime";
import { getOrganizationTrend } from "@/modules/analytics/service";
import { TrendChart } from "@/components/charts/trend-chart";
import { featureFlags } from "@/lib/feature-flags";

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
    { label: "공개 중 홈페이지", value: Number(published?.value ?? 0), href: "/admin/projects?status=PUBLISHED" },
    { label: "편집 중 / 미발행", value: Number(drafts?.value ?? 0), href: "/admin/projects?status=DRAFT" },
    ...(flags.leadAdmin
      ? [{ label: "최근 7일 관심고객", value: Number(newLeads?.value ?? 0), href: "/admin/leads" }]
      : []),
    { label: "알림 실패", value: Number(failed?.value ?? 0), href: "/admin/notifications?status=FAILED" },
    { label: "7일 내 만료 예정", value: Number(expiring?.value ?? 0), href: "/admin/projects?expiring=1" },
  ];

  if (recentProjects.length === 0) {
    return (
      <EmptyState
        title="아직 홈페이지가 없습니다"
        description="첫 분양 홈페이지를 만들고 바로 발행할 수 있습니다."
        action={
          <Link href="/admin/projects/new">
            <Button data-testid="first-project">첫 홈페이지 만들기</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">대시보드</h1>
        <p className="mt-2 text-text-body">실제 운영 데이터만 표시합니다. 샘플 수치는 넣지 않습니다.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{card.value}</p>
          </Link>
        ))}
      </div>
      <div className="rounded-2xl bg-white p-5">
        <h2 className="font-semibold">최근 7일 조회·관심고객</h2>
        <div className="mt-4">
          <TrendChart data={trend} />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5">
          <h2 className="font-semibold">최근 프로젝트</h2>
          <ul className="mt-4 space-y-3">
            {recentProjects.map((project) => (
              <li key={project.id} className="flex justify-between text-sm">
                <Link href={`/admin/projects/${project.id}`}>{project.name}</Link>
                <span className="text-text-muted">{project.status}</span>
              </li>
            ))}
          </ul>
        </div>
        {flags.leadAdmin ? (
          <div className="rounded-2xl bg-white p-5">
            <h2 className="font-semibold">최근 관심고객</h2>
            {recentLeads.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">등록폼이 공개되면 여기에 데이터가 쌓입니다.</p>
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
