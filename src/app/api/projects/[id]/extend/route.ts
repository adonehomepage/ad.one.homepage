import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { extendProject } from "@/modules/publishing/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = z.object({ additionalMonths: z.number().int().min(1) }).parse(await request.json());
  return withStaff(async (ctx) =>
    extendProject({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      additionalMonths: body.additionalMonths,
    }),
  );
}
