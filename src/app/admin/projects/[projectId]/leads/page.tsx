import { listLeads } from "@/modules/leads/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LeadTable } from "@/app/admin/leads/lead-table";
import { ExportLeadsButton } from "@/app/admin/leads/lead-actions";
import { assertLeadAdminFeature } from "@/lib/feature-guard";

export default async function ProjectLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  assertLeadAdminFeature();
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { projectId } = await params;
  const { q } = await searchParams;
  const items = await listLeads({ organizationId: ctx.organization.id, projectId, q });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">프로젝트 관심고객</h1>
        <ExportLeadsButton projectId={projectId} />
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="이름 또는 전화번호" className="h-11 flex-1 rounded-lg border border-border px-3" />
        <button className="rounded-lg border border-border px-4 text-sm" type="submit">
          검색
        </button>
      </form>
      <LeadTable items={items} />
    </div>
  );
}
