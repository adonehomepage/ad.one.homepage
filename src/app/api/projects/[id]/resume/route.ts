import { withStaff } from "@/lib/api/http";
import { resumeProject } from "@/modules/publishing/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    await resumeProject({ organizationId: ctx.organization.id, projectId: id, userId: ctx.user.id });
    return { ok: true };
  });
}
