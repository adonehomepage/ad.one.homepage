import { z } from "zod";
import { eq } from "drizzle-orm";
import { withAdmin, withStaff } from "@/lib/api/http";
import { db } from "@/lib/db";
import { organizationSettings } from "@/lib/db/schema";
import { writeAudit } from "@/modules/audit/service";

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
  const body = z
    .object({
      brandName: z.string().optional(),
      legalCompanyName: z.string().optional(),
      kakaoChannelName: z.string().optional(),
      supportEmail: z.string().optional(),
      privacyOfficerName: z.string().optional(),
      privacyContactEmail: z.string().optional(),
      defaultDurationMonths: z.number().int().min(1).optional(),
    })
    .parse(await request.json());
  return withAdmin(async (ctx) => {
    await db
      .insert(organizationSettings)
      .values({
        organizationId: ctx.organization.id,
        brandName: body.brandName,
        legalCompanyName: body.legalCompanyName,
        kakaoChannelName: body.kakaoChannelName,
        supportEmail: body.supportEmail,
        privacyOfficerName: body.privacyOfficerName,
        privacyContactEmail: body.privacyContactEmail,
        defaultDurationMonths: body.defaultDurationMonths ?? 3,
        updatedBy: ctx.user.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: organizationSettings.organizationId,
        set: {
          ...body,
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
