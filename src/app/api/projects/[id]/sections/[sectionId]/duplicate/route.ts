import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { getDraft, mapSectionRow, saveDraft } from "@/modules/projects/service";
import { duplicateSection } from "@/modules/sections/duplicate";

type Params = { params: Promise<{ id: string; sectionId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id, sectionId } = await params;
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(request, z.object({ expectedRevision: z.number().int().nonnegative() }));
    const data = await getDraft(ctx.organization.id, id);
    const next = duplicateSection({
      sections: data.sections.map(mapSectionRow),
      selectedSectionId: sectionId,
      projectId: id,
    });
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
