import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { listVersions, restoreVersion } from "@/modules/publishing/service";
import { ApiError } from "@/lib/errors";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id, versionId } = await params;
  return withStaff(async (ctx) => {
    const versions = await listVersions(ctx.organization.id, id);
    const version = versions.find((item) => item.id === versionId);
    if (!version) throw new ApiError("NOT_FOUND", "버전을 찾을 수 없습니다.", 404);
    return { version };
  });
}

export async function POST(request: Request, { params }: Params) {
  const { id, versionId } = await params;
  const body = z.object({ republish: z.boolean().default(false) }).parse(await request.json().catch(() => ({ republish: false })));
  return withStaff(async (ctx) =>
    restoreVersion({
      organizationId: ctx.organization.id,
      projectId: id,
      versionId,
      userId: ctx.user.id,
      republish: body.republish,
    }),
  );
}
