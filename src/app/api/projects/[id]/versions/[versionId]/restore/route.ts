import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { ApiError } from "@/lib/errors";
import { listVersions, restoreVersion } from "@/modules/publishing/service";
import { orgText } from "@/modules/admin/org-copy";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id, versionId } = await params;
  return withStaff(async (ctx) => {
    const versions = await listVersions(ctx.organization.id, id);
    const version = versions.find((item) => item.id === versionId);
    if (!version) throw new ApiError("NOT_FOUND", orgText("versionNotFound"), 404);
    return { version };
  });
}

export async function POST(request: Request, { params }: Params) {
  const { id, versionId } = await params;
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(request, z.object({ republish: z.boolean().default(false) }), { republish: false });
    return restoreVersion({
      organizationId: ctx.organization.id,
      projectId: id,
      versionId,
      userId: ctx.user.id,
      republish: body.republish,
    });
  });
}
