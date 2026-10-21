import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { getProject, updatePublicSlug } from "@/modules/projects/service";
import { deleteProject } from "@/modules/publishing/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => getProject(ctx.organization.id, id));
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(request, z.object({ publicSlug: z.string().min(1) }));
    return updatePublicSlug({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      publicSlug: body.publicSlug,
    });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(request, z.object({ confirmName: z.string().min(1) }));
    await deleteProject({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      confirmName: body.confirmName,
    });
    return { ok: true };
  });
}
