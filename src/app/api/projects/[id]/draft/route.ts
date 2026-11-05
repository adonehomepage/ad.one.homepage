import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { DRAFT_RATE_LIMIT_MAX, DRAFT_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { draftPatchSchema } from "@/lib/validation/draft";
import { orgText } from "@/modules/admin/org-copy";
import { getDraft, mapSectionRow, saveDraft } from "@/modules/projects/service";
import { clampLaunchExcludedSection } from "@/modules/sections/duplicate";
import { normalizeFormSettings, normalizeGlobalSettings, normalizePrivacySettings, normalizeSectionContent } from "@/modules/templates/definitions";
import type { PageSnapshot } from "@/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const data = await getDraft(ctx.organization.id, id);
    const draft = data.draft
      ? {
          ...data.draft,
          globalSettings: normalizeGlobalSettings((data.draft.globalSettings ?? {}) as Record<string, unknown>),
          formSettings: normalizeFormSettings(data.draft.formSettings as PageSnapshot["formSettings"]),
          privacySettings: normalizePrivacySettings(data.draft.privacySettings as PageSnapshot["privacy"]),
        }
      : data.draft;
    return {
      project: data.project,
      template: data.template,
      draft,
      // 에디터 초기 로드: FAQ·gallery 숨김 + 배열 상한 (oak-editorial FAQ는 본문이므로 유지).
      sections: data.sections.map((row) => {
        const clamped = clampLaunchExcludedSection(mapSectionRow(row), {
          templateCode: String(data.template.code),
        });
        return {
          ...clamped,
          content: normalizeSectionContent(clamped.sectionType, clamped.content ?? {}),
        };
      }),
    };
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const limited = consumeRateLimit(`draft:${ctx.user.id}`, DRAFT_RATE_LIMIT_MAX, DRAFT_RATE_LIMIT_WINDOW_MS);
    if (!limited.ok) {
      throw new ApiError("RATE_LIMITED", orgText("requestFailed"), 429, undefined, limited.retryAt);
    }
    const body = await parseJsonBody(request, draftPatchSchema);
    return saveDraft({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      expectedRevision: body.expectedRevision,
      globalSettings: body.globalSettings,
      formSettings: body.formSettings,
      seoSettings: body.seoSettings,
      privacySettings: body.privacySettings,
      sections: body.sections,
    });
  });
}
