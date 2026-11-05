import Link from "next/link";
import { LeadTable } from "@/app/admin/leads/lead-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { getAuthContext } from "@/lib/auth/session";
import { featureFlags } from "@/lib/feature-flags";
import { assertLeadAdminFeature } from "@/lib/feature-guard";
import { orgText } from "@/modules/admin/org-copy";
import { listLeads, listLeadSites } from "@/modules/leads/service";
import { redirect } from "next/navigation";

export const metadata = { title: "관심고객" };

const PAGE_SIZE = 50;
const GROUP_SIZE = 8;
const SOURCES = ["naver", "kakao", "instagram", "direct"] as const;

function leadsHref(query: { projectId?: string; source?: string; q?: string; page?: number }) {
  const params = new URLSearchParams();
  if (query.projectId) params.set("projectId", query.projectId);
  if (query.source) params.set("source", query.source);
  if (query.q) params.set("q", query.q);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const text = params.toString();
  return text ? `/admin/leads?${text}` : "/admin/leads";
}

function sourceLabel(value: (typeof SOURCES)[number]) {
  if (value === "naver") return orgText("sourceNaver");
  if (value === "kakao") return orgText("sourceKakao");
  if (value === "instagram") return orgText("sourceInstagram");
  return orgText("sourceDirect");
}

export default async function AllLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; projectId?: string; source?: string }>;
}) {
  assertLeadAdminFeature();
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const query = params.q?.trim() ?? "";
  const sourceId = SOURCES.includes(params.source as (typeof SOURCES)[number]) ? params.source! : "";
  const sites = await listLeadSites(ctx.organization.id);
  const knownSite = sites.find((site) => site.id === params.projectId);
  const emptyDescription = featureFlags().leadCollection ? orgText("leadsEmpty") : orgText("leadCollectionDisabled");

  const groups = knownSite
    ? []
    : (
        await Promise.all(
          sites.map(async (site) => ({
            site,
            items: await listLeads({
              organizationId: ctx.organization.id,
              projectId: site.id,
              q: query || undefined,
              source: sourceId || undefined,
              page: 1,
              limit: GROUP_SIZE,
            }),
          })),
        )
      ).filter((group) => group.items.length > 0);

  const items = knownSite
    ? await listLeads({
        organizationId: ctx.organization.id,
        projectId: knownSite.id,
        q: query || undefined,
        source: sourceId || undefined,
        page,
        limit: PAGE_SIZE,
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{orgText("navLeads")}</h1>
        <p className="mt-1 text-sm text-text-body">{orgText("leadsBody")}</p>
      </div>
      <form className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-56">
          <select name="projectId" defaultValue={knownSite?.id ?? ""} className="ui-field" aria-label={orgText("colProject")}>
            <option value="">{orgText("filterAllSites")}</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} · /{site.slug} ({site.count})
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-36">
          <select name="source" defaultValue={sourceId} className="ui-field" aria-label={orgText("colLeadSource")}>
            <option value="">{orgText("filterAllSources")}</option>
            {SOURCES.map((value) => (
              <option key={value} value={value}>
                {sourceLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <Input
          name="q"
          defaultValue={query}
          placeholder={orgText("leadSearch")}
          aria-label={orgText("searchAriaLabel")}
          className="min-w-0 flex-1 sm:max-w-xs"
        />
        <Button variant="ghost" type="submit">
          {orgText("search")}
        </Button>
      </form>

      {knownSite ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text-primary">{knownSite.name}</h2>
              <p className="mt-1 text-sm text-text-muted">
                {query || sourceId
                  ? `/${knownSite.slug}`
                  : orgText("leadSiteMeta").replace("{slug}", knownSite.slug).replace("{n}", String(knownSite.count))}
              </p>
            </div>
            <Link href={leadsHref({ source: sourceId, q: query })} className="text-sm font-semibold text-primary">
              {orgText("filterAllSites")}
            </Link>
          </div>
          {items.length === 0 ? (
            <EmptyState title={orgText("leadsEmptyTitle")} description={emptyDescription} />
          ) : (
            <LeadTable items={items} showProject={false} />
          )}
          {page > 1 || items.length === PAGE_SIZE ? (
            <div className="flex items-center justify-between gap-3">
              {page > 1 ? (
                <Link href={leadsHref({ projectId: knownSite.id, source: sourceId, q: query, page: page - 1 })} className="text-sm font-semibold text-primary">
                  {orgText("pagePrev")}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-sm text-text-muted">{orgText("pageStatus").replace("{page}", String(page))}</span>
              {items.length === PAGE_SIZE ? (
                <Link href={leadsHref({ projectId: knownSite.id, source: sourceId, q: query, page: page + 1 })} className="text-sm font-semibold text-primary">
                  {orgText("pageNext")}
                </Link>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </section>
      ) : groups.length === 0 ? (
        <EmptyState title={orgText("leadsEmptyTitle")} description={emptyDescription} />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.site.id} className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{group.site.name}</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    {query || sourceId
                      ? `/${group.site.slug}`
                      : orgText("leadSiteMeta").replace("{slug}", group.site.slug).replace("{n}", String(group.site.count))}
                  </p>
                </div>
                <Link href={leadsHref({ projectId: group.site.id, source: sourceId, q: query })} className="text-sm font-semibold text-primary">
                  {orgText("leadSiteOnly")}
                </Link>
              </div>
              <LeadTable items={group.items} showProject={false} />
              {group.items.length === GROUP_SIZE ? (
                <p className="text-sm text-text-muted">{orgText("leadGroupHint").replace("{n}", String(GROUP_SIZE))}</p>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
