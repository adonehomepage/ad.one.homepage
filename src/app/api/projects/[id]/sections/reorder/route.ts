import { withStaff } from "@/lib/api/http";
import { getDraft, mapSectionRow, saveDraft } from "@/modules/projects/service";
import { duplicateSection, reorderSections } from "@/modules/sections/duplicate";
import { ApiError } from "@/lib/errors";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  return withStaff(async (ctx) => {
    const data = await getDraft(ctx.organization.id, id);
    const sections = data.sections.map(mapSectionRow);
    if (body.action === "reorder") {
      const next = reorderSections(sections, body.orderedIds);
      await saveDraft({
        organizationId: ctx.organization.id,
        projectId: id,
        userId: ctx.user.id,
        expectedRevision: data.project.draftRevision,
        sections: next,
      });
      return { sections: next };
    }
    throw new ApiError("VALIDATION_ERROR", "지원하지 않는 작업입니다.");
  });
}
