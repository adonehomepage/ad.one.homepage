import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { getProject } from "@/modules/projects/service";
import { deleteProject } from "@/modules/publishing/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => getProject(ctx.organization.id, id));
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const body = z.object({ confirmName: z.string() }).parse(await request.json());
  return withStaff(async (ctx) => {
    await deleteProject({ organizationId: ctx.organization.id, projectId: id, userId: ctx.user.id, confirmName: body.confirmName });
    return { ok: true };
  });
}
