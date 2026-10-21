import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, organizationSettings, userProfiles } from "@/lib/db/schema";
import { getAuthContext, isSystemAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatSeoul } from "@/lib/datetime";
import { appConfig } from "@/lib/config";
import { getDeployEnv } from "@/lib/deploy-env";
import { featureFlags } from "@/lib/feature-flags";
import { SettingsForm } from "@/app/admin/settings/settings-form";
import { EmptyState } from "@/components/ui/empty-state";
import { auditActionLabel, auditResourceLabel, orgText } from "@/modules/admin/org-copy";

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

export async function AuditLogsView({
  page = 1,
  basePath = "/admin/audit-logs",
}: {
  page?: number;
  basePath?: string;
}) {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const currentPage = Math.max(1, page);
  const rows = await db
    .select({
      log: auditLogs,
      actorName: userProfiles.name,
      actorEmail: userProfiles.email,
    })
    .from(auditLogs)
    .leftJoin(userProfiles, eq(userProfiles.id, auditLogs.actorUserId))
    .where(eq(auditLogs.organizationId, ctx.organization.id))
    .orderBy(desc(auditLogs.occurredAt))
    .limit(AUDIT_PAGE_SIZE)
    .offset((currentPage - 1) * AUDIT_PAGE_SIZE);
  if (rows.length === 0) {
    if (currentPage > 1) {
      return (
        <EmptyState
          title={orgText("auditPageEmptyTitle")}
          description={orgText("auditPageEmpty")}
          action={
            <Link href={`${basePath}?page=${currentPage - 1}`} className="text-sm font-semibold text-primary">
              {orgText("pagePrev")}
            </Link>
          }
        />
      );
    }
    return <EmptyState title={orgText("auditEmptyTitle")} description={orgText("auditEmpty")} />;
  }
  const hasPrev = currentPage > 1;
  const hasNext = rows.length === AUDIT_PAGE_SIZE;
  return (
    <div className="space-y-3">
      {rows.map(({ log, actorName, actorEmail }) => {
        const meta = log.metadataJson && typeof log.metadataJson === "object" ? JSON.stringify(log.metadataJson) : "";
        return (
          <div key={log.id} className="ui-card text-sm">
            <p className="font-medium">{auditActionLabel(log.action)}</p>
            <p className="text-text-muted">
              {auditResourceLabel(log.resourceType)}
              {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}…` : ""} · {formatSeoul(log.occurredAt)}
            </p>
            <p className="mt-1 text-text-muted">
              {actorName || actorEmail || orgText("auditActorUnknown")}
              {meta && meta !== "{}" ? ` · ${meta.slice(0, 120)}` : ""}
            </p>
          </div>
        );
      })}
      {hasPrev || hasNext ? (
        <nav className="flex items-center justify-between gap-3 pt-2" aria-label={orgText("auditNavLabel")}>
          {hasPrev ? (
            <Link href={`${basePath}?page=${currentPage - 1}`} className="text-sm font-semibold text-primary">
              {orgText("pagePrev")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-text-muted">{orgText("pageStatus").replace("{page}", String(currentPage))}</span>
          {hasNext ? (
            <Link href={`${basePath}?page=${currentPage + 1}`} className="text-sm font-semibold text-primary">
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
