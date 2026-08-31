import { z } from "zod";
import { withAdmin } from "@/lib/api/http";
import { inviteMember, listMembers } from "@/modules/members/service";

export async function GET() {
  return withAdmin(async (ctx) => ({ members: await listMembers(ctx.organization.id) }));
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = z.object({
    email: z.string(),
    name: z.string(),
    role: z.enum(["SYSTEM_ADMIN", "MEMBER"]).default("MEMBER"),
  }).parse(body);
  return withAdmin(async (ctx) =>
    inviteMember({
      organizationId: ctx.organization.id,
      actorUserId: ctx.user.id,
      email: parsed.email,
      name: parsed.name,
      role: parsed.role,
    }),
  );
}
