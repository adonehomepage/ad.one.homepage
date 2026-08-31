import { z } from "zod";
import { withAdmin } from "@/lib/api/http";
import { changeRole, reactivateMember, suspendMember } from "@/modules/members/service";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = z.object({ role: z.enum(["SYSTEM_ADMIN", "MEMBER"]) }).parse(await request.json());
  return withAdmin(async (ctx) => {
    await changeRole({ organizationId: ctx.organization.id, actorUserId: ctx.user.id, memberId: id, role: body.role });
    return { ok: true };
  });
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  return withAdmin(async (ctx) => {
    if (action === "reactivate") {
      await reactivateMember({ organizationId: ctx.organization.id, actorUserId: ctx.user.id, memberId: id });
    } else {
      await suspendMember({ organizationId: ctx.organization.id, actorUserId: ctx.user.id, memberId: id });
    }
    return { ok: true };
  });
}
