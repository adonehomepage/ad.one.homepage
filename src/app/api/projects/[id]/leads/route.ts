import { withStaff } from "@/lib/api/http";
import { requireLeadAdmin } from "@/lib/feature-guard";
import { listLeads } from "@/modules/leads/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  return withStaff(async (ctx) => {
    requireLeadAdmin();
    return {
      items: await listLeads({
        organizationId: ctx.organization.id,
        projectId: id,
        q: url.searchParams.get("q") ?? undefined,
        page: Number(url.searchParams.get("page") ?? 1),
      }),
    };
  });
}
