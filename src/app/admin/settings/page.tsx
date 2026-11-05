import Link from "next/link";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, organizationSettings, projects, userProfiles } from "@/lib/db/schema";
import { getAuthContext, isSystemAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatSeoul } from "@/lib/datetime";
import { appConfig } from "@/lib/config";
import { getDeployEnv } from "@/lib/deploy-env";
import { featureFlags } from "@/lib/feature-flags";
import { SettingsForm } from "@/app/admin/settings/settings-form";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { auditActionLabel, auditFilterOptions, auditResourceLabel, orgText } from "@/modules/admin/org-copy";

export const metadata = { title: "설정" };

const AUDIT_PAGE_SIZE = 50;

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const flags = featureFlags();
  const [settings] = await db
    .select()
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, ctx.organization.id))
    .limit(1);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{orgText("navSettings")}</h1>
        <p className="mt-2 text-sm text-text-body">{orgText("settingsBody")}</p>
      </div>
      <dl className="ui-card grid grid-cols-2 gap-px overflow-hidden bg-border !p-0">
        {[
          [orgText("deployEnv"), `${getDeployEnv()} (${appConfig.env})`],
          [orgText("leadCollection"), appConfig.leadCollectionEnabled ? orgText("leadOn") : orgText("leadOff")],
          [orgText("leadAdminUi"), flags.leadAdmin ? orgText("leadAdminOn") : orgText("leadAdminOff")],
          [orgText("providers"), `${appConfig.kakaoProvider} / ${appConfig.emailProvider}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-white px-5 py-3">
            <dt className="text-xs text-text-muted">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {isSystemAdmin(ctx.member) ? (
        <SettingsForm
          initial={{
            brandName: settings?.brandName,
            legalCompanyName: settings?.legalCompanyName,
            kakaoChannelName: settings?.kakaoChannelName,
            supportEmail: settings?.supportEmail,
            privacyOfficerName: settings?.privacyOfficerName,
            privacyContactEmail: settings?.privacyContactEmail,
            defaultDurationMonths: settings?.defaultDurationMonths,
          }}
        />
      ) : (
        <p className="text-sm text-text-muted">{orgText("settingsAdminOnly")}</p>
      )}
    </div>
  );
}

function auditHref(basePath: string, query: { q?: string; action?: string; resource?: string; page?: number }) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.action) params.set("action", query.action);
  if (query.resource) params.set("resource", query.resource);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const text = params.toString();
  return text ? `${basePath}?${text}` : basePath;
}

function auditDetail(metadata: unknown, projectName: string | null) {
  const record = metadata && typeof metadata === "object" ? (metadata as Record<string, unknown>) : {};
  const name = String(record.projectName ?? record.name ?? projectName ?? "").trim();
  const slug = String(record.slug ?? "").trim();
  return [name, slug ? `/${slug}` : ""].filter(Boolean).join(" · ");
}

export async function AuditLogsView({
  page = 1,
  basePath = "/admin/audit-logs",
  q = "",
  action = "",
  resource = "",
}: {
  page?: number;
  basePath?: string;
  q?: string;
  action?: string;
  resource?: string;
}) {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const currentPage = Math.max(1, page);
  const options = auditFilterOptions();
  const query = q.trim();
  const actionFilter = options.actions.some((item) => item.value === action) ? action : "";
  const resourceFilter = options.resources.some((item) => item.value === resource) ? resource : "";
  const filters = [eq(auditLogs.organizationId, ctx.organization.id)];
  if (actionFilter) filters.push(eq(auditLogs.action, actionFilter));
  if (resourceFilter) filters.push(eq(auditLogs.resourceType, resourceFilter));
  const safe = query.replace(/[%_\\]/g, "");
  if (safe) {
    const matchedActions = options.actions.filter((item) => item.label.includes(safe)).map((item) => item.value);
    const parts = [
      ilike(userProfiles.name, `%${safe}%`),
      ilike(userProfiles.email, `%${safe}%`),
      ilike(projects.name, `%${safe}%`),
      ilike(auditLogs.action, `%${safe}%`),
      sql`${auditLogs.metadataJson}::text ilike ${"%" + safe + "%"}`,
    ];
    if (matchedActions.length > 0) parts.push(inArray(auditLogs.action, matchedActions));
    filters.push(or(...parts)!);
  }

  const rows = await db
    .select({
      log: auditLogs,
      actorName: userProfiles.name,
      actorEmail: userProfiles.email,
      projectName: projects.name,
    })
    .from(auditLogs)
    .leftJoin(userProfiles, eq(userProfiles.id, auditLogs.actorUserId))
    .leftJoin(projects, eq(projects.id, auditLogs.resourceId))
    .where(and(...filters))
    .orderBy(desc(auditLogs.occurredAt))
    .limit(AUDIT_PAGE_SIZE)
    .offset((currentPage - 1) * AUDIT_PAGE_SIZE);

  const filtered = Boolean(safe || actionFilter || resourceFilter);
  const hasPrev = currentPage > 1;
  const hasNext = rows.length === AUDIT_PAGE_SIZE;

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap items-center gap-2" action={basePath}>
        <div className="w-full sm:w-44">
          <select name="action" defaultValue={actionFilter} className="ui-field" aria-label={orgText("colKind")}>
            <option value="">{orgText("filterAllActions")}</option>
            {options.actions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-40">
          <select name="resource" defaultValue={resourceFilter} className="ui-field" aria-label={orgText("colTarget")}>
            <option value="">{orgText("filterAllResources")}</option>
            {options.resources.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          name="q"
          defaultValue={query}
          placeholder={orgText("auditSearch")}
          aria-label={orgText("searchAriaLabel")}
          className="min-w-0 flex-1 sm:max-w-xs"
        />
        <Button variant="ghost" type="submit">
          {orgText("search")}
        </Button>
      </form>
      {rows.length === 0 ? (
        currentPage > 1 ? (
          <EmptyState
            title={orgText("auditPageEmptyTitle")}
            description={orgText("auditPageEmpty")}
            action={
              <Link
                href={auditHref(basePath, { q: query, action: actionFilter, resource: resourceFilter, page: currentPage - 1 })}
                className="text-sm font-semibold text-primary"
              >
                {orgText("pagePrev")}
              </Link>
            }
          />
        ) : (
          <EmptyState
            title={filtered ? orgText("auditFilterEmptyTitle") : orgText("auditEmptyTitle")}
            description={filtered ? orgText("auditFilterEmpty") : orgText("auditEmpty")}
          />
        )
      ) : (
        <div className="ui-table">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-surface text-text-muted">
              <tr>
                <th className="w-40 px-4 py-3 font-medium">{orgText("colWhen")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colKind")}</th>
                <th className="w-28 px-4 py-3 font-medium">{orgText("colTarget")}</th>
                <th className="px-4 py-3 font-medium">{orgText("colNote")}</th>
                <th className="w-40 px-4 py-3 font-medium">{orgText("colActor")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ log, actorName, actorEmail, projectName }) => {
                const detail = auditDetail(log.metadataJson, projectName);
                return (
                  <tr key={log.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-3 text-text-muted">{formatSeoul(log.occurredAt)}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{auditActionLabel(log.action)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-body">{auditResourceLabel(log.resourceType)}</td>
                    <td className="max-w-72 truncate px-4 py-3 text-text-body" title={detail || undefined}>
                      {detail || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{actorName || orgText("auditActorUnknown")}</p>
                      {actorEmail ? <p className="truncate text-xs text-text-muted">{actorEmail}</p> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {hasPrev || hasNext ? (
        <nav className="flex items-center justify-between gap-3" aria-label={orgText("auditNavLabel")}>
          {hasPrev ? (
            <Link
              href={auditHref(basePath, { q: query, action: actionFilter, resource: resourceFilter, page: currentPage - 1 })}
              className="text-sm font-semibold text-primary"
            >
              {orgText("pagePrev")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-text-muted">{orgText("pageStatus").replace("{page}", String(currentPage))}</span>
          {hasNext ? (
            <Link
              href={auditHref(basePath, { q: query, action: actionFilter, resource: resourceFilter, page: currentPage + 1 })}
              className="text-sm font-semibold text-primary"
            >
              {orgText("pageNext")}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
