import { withStaff } from "@/lib/api/http";
import { getDraft, mapSectionRow, saveDraft } from "@/modules/projects/service";
import { duplicateSection } from "@/modules/sections/duplicate";

type Params = { params: Promise<{ id: string; sectionId: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id, sectionId } = await params;
  return withStaff(async (ctx) => {
    const data = await getDraft(ctx.organization.id, id);
    const next = duplicateSection({
      sections: data.sections.map(mapSectionRow),
      selectedSectionId: sectionId,
      projectId: id,
    });
    await saveDraft({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      expectedRevision: data.project.draftRevision,
      sections: next,
    });
    return { sections: next };
  });
}
