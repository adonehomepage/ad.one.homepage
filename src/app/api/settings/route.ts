import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAdmin, withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { db } from "@/lib/db";
import { organizationSettings } from "@/lib/db/schema";
import { writeAudit } from "@/modules/audit/service";
import { appConfig } from "@/lib/config";
import { isEmail } from "@/lib/validation/phone";
import { orgText } from "@/modules/admin/org-copy";

const optionalEmail = z
  .string()
  .optional()
  .transform((value) => value?.trim() ?? "")
  .refine((value) => !value || isEmail(value), { message: orgText("emailInvalid") });

const optionalSettings = z.object({
  brandName: z.string().optional(),
  legalCompanyName: z.string().optional(),
  kakaoChannelName: z.string().optional(),
  supportEmail: optionalEmail,
  privacyOfficerName: z.string().optional(),
  privacyContactEmail: optionalEmail,
  defaultDurationMonths: z.number().int().min(1).max(appConfig.maxDurationMonths).optional(),
});

export async function GET() {
  return withStaff(async (ctx) => {
    const [settings] = await db
      .select()
      .from(organizationSettings)
      .where(eq(organizationSettings.organizationId, ctx.organization.id))
      .limit(1);
    return { settings: settings ?? null };
  });
}

export async function PATCH(request: Request) {
  return withAdmin(async (ctx) => {
    const body = await parseJsonBody(request, optionalSettings);
    const supportEmail = body.supportEmail || null;
    const privacyContactEmail = body.privacyContactEmail || null;
    await db
      .insert(organizationSettings)
      .values({
        organizationId: ctx.organization.id,
        brandName: body.brandName,
        legalCompanyName: body.legalCompanyName,
        kakaoChannelName: body.kakaoChannelName,
        supportEmail,
        privacyOfficerName: body.privacyOfficerName,
        privacyContactEmail,
        defaultDurationMonths: body.defaultDurationMonths ?? 3,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: organizationSettings.organizationId,
        set: {
          brandName: body.brandName,
          legalCompanyName: body.legalCompanyName,
          kakaoChannelName: body.kakaoChannelName,
          supportEmail,
          privacyOfficerName: body.privacyOfficerName,
          privacyContactEmail,
          defaultDurationMonths: body.defaultDurationMonths,
          updatedBy: ctx.user.id,
          updatedAt: new Date(),
        },
      });
    await writeAudit({
      organizationId: ctx.organization.id,
      actorUserId: ctx.user.id,
      action: "settings.update",
      resourceType: "organization_settings",
      resourceId: ctx.organization.id,
    });
    return { ok: true };
  });
}
