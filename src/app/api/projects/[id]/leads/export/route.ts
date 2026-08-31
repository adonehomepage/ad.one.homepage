import { withStaff } from "@/lib/api/http";
import { exportLeads } from "@/modules/leads/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const csv = await exportLeads({ organizationId: ctx.organization.id, projectId: id, actorUserId: ctx.user.id });
    return { csv };
  });
}
