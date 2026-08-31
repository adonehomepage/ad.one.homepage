import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { getDraft, mapSectionRow, saveDraft } from "@/modules/projects/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const data = await getDraft(ctx.organization.id, id);
    return {
      project: data.project,
      template: data.template,
      draft: data.draft,
      sections: data.sections.map(mapSectionRow),
    };
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  return withStaff(async (ctx) =>
    saveDraft({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      expectedRevision: Number(body.expectedRevision),
      globalSettings: body.globalSettings,
      formSettings: body.formSettings,
      seoSettings: body.seoSettings,
      privacySettings: body.privacySettings,
      sections: body.sections,
    }),
  );
}
