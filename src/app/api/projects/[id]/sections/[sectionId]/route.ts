import { withStaff } from "@/lib/api/http";
import { getDraft, mapSectionRow, saveDraft } from "@/modules/projects/service";
import { ApiError } from "@/lib/errors";

type Params = { params: Promise<{ id: string; sectionId: string }> };

export async function DELETE(_: Request, { params }: Params) {
  const { id, sectionId } = await params;
  return withStaff(async (ctx) => {
    const data = await getDraft(ctx.organization.id, id);
    const sections = data.sections.map(mapSectionRow);
    const target = sections.find((section) => section.id === sectionId);
    if (!target) throw new ApiError("NOT_FOUND", "섹션을 찾을 수 없습니다.", 404);
    if (target.isOriginal || target.isRequired) {
      throw new ApiError("FORBIDDEN", "원본 및 필수 섹션은 삭제할 수 없습니다.");
    }
    const next = sections.filter((section) => section.id !== sectionId).map((section, index) => ({ ...section, sortOrder: index }));
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
