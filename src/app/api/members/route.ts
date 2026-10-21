import { z } from "zod";
import { withAdmin } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { INVITE_SEND_RATE_LIMIT_MAX, INVITE_SEND_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { isEmail } from "@/lib/validation/phone";
import { inviteMember, listMembers } from "@/modules/members/service";
import { orgText } from "@/modules/admin/org-copy";

export async function GET() {
  return withAdmin(async (ctx) => ({ members: await listMembers(ctx.organization.id) }));
}

export async function POST(request: Request) {
  return withAdmin(async (ctx) => {
    const limited = consumeRateLimit(
      `invite-send:${ctx.organization.id}:${ctx.user.id}`,
      INVITE_SEND_RATE_LIMIT_MAX,
      INVITE_SEND_RATE_LIMIT_WINDOW_MS,
    );
    if (!limited.ok) {
      throw new ApiError("RATE_LIMITED", orgText("requestFailed"), 429, undefined, limited.retryAt);
    }
    const body = await parseJsonBody(
      request,
      z.object({
        email: z
          .string()
          .trim()
          .refine((value) => isEmail(value), { message: orgText("emailInvalid") }),
        name: z.string().trim().min(1, orgText("requestFailed")),
        role: z.enum(["SYSTEM_ADMIN", "MEMBER"]).default("MEMBER"),
      }),
    );
    return inviteMember({
      organizationId: ctx.organization.id,
      actorUserId: ctx.user.id,
      email: body.email,
      name: body.name,
      role: body.role,
    });
  });
}
