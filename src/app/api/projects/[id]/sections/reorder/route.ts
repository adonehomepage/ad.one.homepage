import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { getDraft, mapSectionRow, saveDraft } from "@/modules/projects/service";
import { reorderSections } from "@/modules/sections/duplicate";
import { ApiError } from "@/lib/errors";
import { orgText } from "@/modules/admin/org-copy";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(
      request,
      z.object({
        action: z.literal("reorder").default("reorder"),
        orderedIds: z.array(z.string().min(1)).min(1).max(80),
        expectedRevision: z.number().int().nonnegative(),
      }),
    );
    if (body.action !== "reorder") {
      throw new ApiError("VALIDATION_ERROR", orgText("unsupportedAction"));
    }
    const data = await getDraft(ctx.organization.id, id);
    const sections = data.sections.map(mapSectionRow);
    const next = reorderSections(sections, body.orderedIds);
    await saveDraft({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      expectedRevision: body.expectedRevision,
      sections: next,
    });
    return { sections: next, revision: body.expectedRevision + 1 };
  });
}
