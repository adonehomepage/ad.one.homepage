import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { deactivateRecipient, updateRecipient } from "@/modules/recipients/service";

type Params = { params: Promise<{ id: string; recipientId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, recipientId } = await params;
  const patch = z.record(z.string(), z.unknown()).parse(await request.json());
  return withStaff(async (ctx) => {
    await updateRecipient({
      organizationId: ctx.organization.id,
      projectId: id,
      recipientId,
      userId: ctx.user.id,
      patch: patch as never,
    });
    return { ok: true };
  });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id, recipientId } = await params;
  return withStaff(async (ctx) => {
    await deactivateRecipient({
      organizationId: ctx.organization.id,
      projectId: id,
      recipientId,
      userId: ctx.user.id,
    });
    return { ok: true };
  });
}
