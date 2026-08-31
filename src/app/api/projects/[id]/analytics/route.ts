import { withStaff } from "@/lib/api/http";
import { getProjectAnalytics } from "@/modules/analytics/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return withStaff(async (ctx) => getProjectAnalytics(ctx.organization.id, id, from, to));
}
