import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { requireLeadAdmin } from "@/lib/feature-guard";
import { addLeadNote } from "@/modules/leads/service";
import { orgText } from "@/modules/admin/org-copy";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    requireLeadAdmin();
    const body = await parseJsonBody(
      request,
      z.object({
        content: z
          .string()
          .trim()
          .min(1, orgText("leadNoteEmpty"))
          .max(4000, orgText("leadNoteTooLong")),
      }),
    );
    return addLeadNote({ organizationId: ctx.organization.id, leadId: id, authorId: ctx.user.id, content: body.content });
  });
}
