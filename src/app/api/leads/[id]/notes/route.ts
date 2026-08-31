import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { addLeadNote } from "@/modules/leads/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = z.object({ content: z.string() }).parse(await request.json());
  return withStaff(async (ctx) =>
    addLeadNote({ organizationId: ctx.organization.id, leadId: id, authorId: ctx.user.id, content: body.content }),
  );
}
