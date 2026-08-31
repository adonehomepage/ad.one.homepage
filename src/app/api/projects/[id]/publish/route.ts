import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { publishProject } from "@/modules/publishing/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = z.object({ changeSummary: z.string().optional() }).parse(await request.json().catch(() => ({})));
  return withStaff(async (ctx) => {
    const version = await publishProject({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      changeSummary: body.changeSummary,
    });
    return { version };
  });
}
