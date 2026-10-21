import { withStaff } from "@/lib/api/http";
import { assertRequestOrigin } from "@/lib/api/origin";
import { resumeProject } from "@/modules/publishing/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    assertRequestOrigin(request);
    await resumeProject({ organizationId: ctx.organization.id, projectId: id, userId: ctx.user.id });
    return { ok: true };
  });
}
