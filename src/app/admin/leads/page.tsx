import { listLeads } from "@/modules/leads/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LeadTable } from "@/app/admin/leads/lead-table";

export default async function AllLeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; projectId?: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const params = await searchParams;
  const items = await listLeads({
    organizationId: ctx.organization.id,
    q: params.q,
    projectId: params.projectId,
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">관심고객</h1>
        <p className="mt-2 text-sm text-text-body">권한 있는 직원에게는 이름과 연락처가 마스킹 없이 표시됩니다.</p>
      </div>
      <form className="flex gap-2">
        <input name="q" defaultValue={params.q} placeholder="이름 또는 전화번호" className="h-11 flex-1 rounded-lg border border-border px-3" />
        <button className="rounded-lg border border-border px-4 text-sm" type="submit">
          검색
        </button>
      </form>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">등록폼이 공개되면 데이터가 수집됩니다.</p>
      ) : (
        <LeadTable items={items} />
      )}
    </div>
  );
}
