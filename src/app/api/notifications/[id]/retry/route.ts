import { withStaff } from "@/lib/api/http";
import { assertRequestOrigin } from "@/lib/api/origin";
import { retryNotification } from "@/modules/lifecycle/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    assertRequestOrigin(request);
    await retryNotification(ctx.organization.id, id, ctx.user.id);
    return { ok: true };
  });
}
