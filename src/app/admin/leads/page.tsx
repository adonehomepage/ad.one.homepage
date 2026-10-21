import Link from "next/link";
import { listLeads } from "@/modules/leads/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LeadTable } from "@/app/admin/leads/lead-table";
import { assertLeadAdminFeature } from "@/lib/feature-guard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { orgText } from "@/modules/admin/org-copy";

const LEAD_PAGE_SIZE = 50;

function leadsQuery(params: { q?: string; projectId?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.projectId) query.set("projectId", params.projectId);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `/admin/leads?${qs}` : "/admin/leads";
}

export default async function AllLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; projectId?: string; page?: string }>;
}) {
  assertLeadAdminFeature();
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const items = await listLeads({
    organizationId: ctx.organization.id,
    q: params.q,
    projectId: params.projectId,
    page,
  });
  const hasPrev = page > 1;
  const hasNext = items.length === LEAD_PAGE_SIZE;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{orgText("navLeads")}</h1>
        <p className="mt-2 text-sm text-text-body">{orgText("leadsBody")}</p>
      </div>
      <form className="flex gap-2">
        <Input name="q" defaultValue={params.q} placeholder={orgText("leadSearch")} aria-label={orgText("searchAriaLabel")} className="min-w-0 flex-1" />
        {params.projectId ? <input type="hidden" name="projectId" value={params.projectId} /> : null}
        <Button variant="ghost" type="submit">
          {orgText("search")}
        </Button>
      </form>
      {items.length === 0 ? (
        <EmptyState title={orgText("leadsEmptyTitle")} description={orgText("leadsEmpty")} />
      ) : (
        <LeadTable items={items} />
      )}
      {hasPrev || hasNext ? (
        <div className="flex items-center justify-between gap-3">
          {hasPrev ? (
            <Link href={leadsQuery({ ...params, page: page - 1 })} className="text-[17px] font-semibold text-primary">
              {orgText("pagePrev")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-text-muted">{orgText("pageStatus").replace("{page}", String(page))}</span>
          {hasNext ? (
            <Link href={leadsQuery({ ...params, page: page + 1 })} className="text-[17px] font-semibold text-primary">
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
