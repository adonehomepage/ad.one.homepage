import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { publishProject } from "@/modules/publishing/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(request, z.object({ changeSummary: z.string().max(500).optional() }), {});
    const version = await publishProject({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      changeSummary: body.changeSummary,
    });
    return { version };
  });
}
