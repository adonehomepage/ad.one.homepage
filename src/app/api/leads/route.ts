import { withStaff } from "@/lib/api/http";
import { listLeads } from "@/modules/leads/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return withStaff(async (ctx) => ({
    items: await listLeads({
      organizationId: ctx.organization.id,
      projectId: url.searchParams.get("projectId") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      page: Number(url.searchParams.get("page") ?? 1),
    }),
  }));
}
