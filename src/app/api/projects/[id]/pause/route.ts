import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { pauseProject } from "@/modules/publishing/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(request, z.object({ reason: z.string().optional() }), {});
    await pauseProject({ organizationId: ctx.organization.id, projectId: id, userId: ctx.user.id, reason: body.reason });
    return { ok: true };
  });
}
