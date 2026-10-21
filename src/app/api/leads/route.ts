import { withStaff } from "@/lib/api/http";
import { requireLeadAdmin } from "@/lib/feature-guard";
import { listLeads } from "@/modules/leads/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return withStaff(async (ctx) => {
    requireLeadAdmin();
    return {
      items: await listLeads({
        organizationId: ctx.organization.id,
        projectId: url.searchParams.get("projectId") ?? undefined,
        q: url.searchParams.get("q") ?? undefined,
        page: Number(url.searchParams.get("page") ?? 1),
      }),
    };
  });
}
