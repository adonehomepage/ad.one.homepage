import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { getDraft, mapSectionRow, saveDraft } from "@/modules/projects/service";
import { ApiError } from "@/lib/errors";
import { orgText } from "@/modules/admin/org-copy";

type Params = { params: Promise<{ id: string; sectionId: string }> };

export async function DELETE(request: Request, { params }: Params) {
  const { id, sectionId } = await params;
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(request, z.object({ expectedRevision: z.number().int().nonnegative() }));
    const data = await getDraft(ctx.organization.id, id);
    const sections = data.sections.map(mapSectionRow);
    const target = sections.find((section) => section.id === sectionId);
    if (!target) throw new ApiError("NOT_FOUND", orgText("sectionDeleteNotFound"), 404);
    if (target.isOriginal || target.isRequired) {
      throw new ApiError("FORBIDDEN", orgText("sectionDeleteForbidden"));
    }
    const next = sections.filter((section) => section.id !== sectionId).map((section, index) => ({ ...section, sortOrder: index }));
    const result = await saveDraft({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      expectedRevision: body.expectedRevision,
      sections: next,
    });
    return { sections: next, revision: result.revision };
  });
}
