import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { pauseProject, resumeProject } from "@/modules/publishing/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = z.object({ reason: z.string().optional() }).parse(await request.json().catch(() => ({})));
  return withStaff(async (ctx) => {
    await pauseProject({ organizationId: ctx.organization.id, projectId: id, userId: ctx.user.id, reason: body.reason });
    return { ok: true };
  });
}
