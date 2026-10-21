import Link from "next/link";
import { listLeads } from "@/modules/leads/service";
import { getDraft } from "@/modules/projects/service";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LeadTable } from "@/app/admin/leads/lead-table";
import { ExportLeadsButton } from "@/app/admin/leads/lead-actions";
import { assertLeadAdminFeature } from "@/lib/feature-guard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";

const LEAD_PAGE_SIZE = 50;

function leadText(settings: Record<string, unknown>, key: string, fallback: string) {
  return String(settings[key] ?? "").trim() || fallback;
}

function projectLeadsQuery(projectId: string, params: { q?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `/admin/projects/${projectId}/leads?${qs}` : `/admin/projects/${projectId}/leads`;
}

export default async function ProjectLeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  assertLeadAdminFeature();
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { projectId } = await params;
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const items = await listLeads({ organizationId: ctx.organization.id, projectId, q, page });
  const hasPrev = page > 1;
  const hasNext = items.length === LEAD_PAGE_SIZE;
  const draft = await getDraft(ctx.organization.id, projectId).catch(() => null);
  const settings = (draft?.draft.globalSettings ?? {}) as Record<string, unknown>;
  const text = (key: string, fallback: string) => leadText(settings, key, fallback);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{text("shellProjectLeads", "프로젝트 관심고객")}</h1>
        <ExportLeadsButton projectId={projectId} label={text("shellExportCsv", "CSV 내보내기")} />
      </div>
      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder={text("shellLeadSearch", "이름 또는 전화번호")}
          aria-label={text("shellSearchAria", "검색어")}
          className="min-w-0 flex-1"
        />
        <Button variant="ghost" type="submit">{text("shellSearch", "검색")}</Button>
      </form>
      {items.length === 0 ? (
        <EmptyState
          title={text("shellProjectLeadsEmptyTitle", "관심고객이 없습니다")}
          description={text("shellProjectLeadsEmptyBody", "등록폼이 공개되면 이 프로젝트의 관심고객이 여기에 쌓입니다.")}
        />
      ) : (
        <LeadTable
          items={items}
          labels={{
            time: text("shellLeadTime", "등록 일시"),
            project: text("shellLeadProject", "프로젝트"),
            name: text("shellLeadName", "이름"),
            phone: text("shellLeadPhone", "연락처"),
            source: text("shellLeadSource", "유입"),
          }}
        />
      )}
      {hasPrev || hasNext ? (
        <div className="flex items-center justify-between gap-3">
          {hasPrev ? (
            <Link href={projectLeadsQuery(projectId, { q, page: page - 1 })} className="text-[17px] font-semibold text-primary">
              {text("shellPagePrev", "이전")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-text-muted">{text("shellPageStatus", "{page}페이지").replace("{page}", String(page))}</span>
          {hasNext ? (
            <Link href={projectLeadsQuery(projectId, { q, page: page + 1 })} className="text-[17px] font-semibold text-primary">
              {text("shellPageNext", "다음")}
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
