import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { assertRequestOrigin } from "@/lib/api/origin";
import { parseJsonBody } from "@/lib/api/parse";
import { deactivateRecipient, updateRecipient } from "@/modules/recipients/service";

type Params = { params: Promise<{ id: string; recipientId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, recipientId } = await params;
  return withStaff(async (ctx) => {
    const patch = await parseJsonBody(
      request,
      z
        .object({
          name: z.string().trim().min(1).optional(),
          companyName: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().optional(),
          preferredChannel: z.enum(["KAKAO_ALIMTALK", "EMAIL"]).optional(),
          isActive: z.boolean().optional(),
          receiveLeadAlerts: z.boolean().optional(),
          receiveExpiryAlerts: z.boolean().optional(),
        })
        .strict(),
    );
    await updateRecipient({
      organizationId: ctx.organization.id,
      projectId: id,
      recipientId,
      userId: ctx.user.id,
      patch,
    });
    return { ok: true };
  });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id, recipientId } = await params;
  return withStaff(async (ctx) => {
    assertRequestOrigin(request);
    await deactivateRecipient({
      organizationId: ctx.organization.id,
      projectId: id,
      recipientId,
      userId: ctx.user.id,
    });
    return { ok: true };
  });
}
