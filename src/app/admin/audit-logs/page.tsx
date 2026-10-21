import Link from "next/link";
import { getAuthContext, isSystemAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AuditLogsView } from "@/app/admin/settings/page";
import { orgText } from "@/modules/admin/org-copy";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!isSystemAdmin(ctx.member)) redirect("/admin");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{orgText("navAudit")}</h1>
        <p className="mt-2 text-sm text-text-body">{orgText("auditBody")}</p>
      </div>
      <AuditLogsView page={page} basePath="/admin/audit-logs" />
    </div>
  );
}
