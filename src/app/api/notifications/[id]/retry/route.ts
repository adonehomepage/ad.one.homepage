import { withStaff } from "@/lib/api/http";
import { retryNotification } from "@/modules/lifecycle/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    await retryNotification(ctx.organization.id, id, ctx.user.id);
    return { ok: true };
  });
}
