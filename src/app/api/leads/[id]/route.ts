import { withStaff } from "@/lib/api/http";
import { requireLeadAdmin } from "@/lib/feature-guard";
import { getLead } from "@/modules/leads/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    requireLeadAdmin();
    return getLead(ctx.organization.id, id, ctx.user.id);
  });
}
