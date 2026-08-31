import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, organizationSettings } from "@/lib/db/schema";
import { getAuthContext, isSystemAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatSeoul } from "@/lib/datetime";
import { appConfig } from "@/lib/config";
import { SettingsForm } from "@/app/admin/settings/settings-form";

export default async function SettingsPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const [settings] = await db
    .select()
    .from(organizationSettings)
    .where(eq(organizationSettings.organizationId, ctx.organization.id))
    .limit(1);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="mt-2 text-sm text-text-body">브랜드명, 법인명, 카카오 채널명은 출시 전 확정 후 환경변수와 여기서 설정합니다.</p>
      </div>
      <dl className="grid gap-4 rounded-2xl bg-white p-6 md:grid-cols-2">
        <div>
          <dt className="text-sm text-text-muted">관심고객 수집</dt>
          <dd className="mt-1 font-medium">{appConfig.leadCollectionEnabled ? "활성" : "차단(처리 주체 미확정)"}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">발송 공급자</dt>
          <dd className="mt-1 font-medium">{appConfig.kakaoProvider} / {appConfig.emailProvider}</dd>
        </div>
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
        <p className="text-sm text-text-muted">전역 보안 설정 변경은 시스템 관리자만 가능합니다.</p>
      )}
    </div>
  );
}

export async function AuditLogsView() {
  const ctx = await getAuthContext();
  if (!ctx) return null;
  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.organizationId, ctx.organization.id))
    .orderBy(desc(auditLogs.occurredAt))
    .limit(100);
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl bg-white p-4 text-sm">
          <p className="font-medium">{row.action}</p>
          <p className="text-text-muted">
            {row.resourceType} · {formatSeoul(row.occurredAt)}
          </p>
        </div>
      ))}
    </div>
  );
}
