import { withStaff } from "@/lib/api/http";
import { getLead } from "@/modules/leads/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => getLead(ctx.organization.id, id, ctx.user.id));
}
