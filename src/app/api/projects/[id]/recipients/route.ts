import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { addRecipient, listRecipients } from "@/modules/recipients/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => ({ recipients: await listRecipients(ctx.organization.id, id) }));
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(
      request,
      z.object({
        name: z.string().trim().min(1),
        companyName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        preferredChannel: z.enum(["KAKAO_ALIMTALK", "EMAIL"]).default("KAKAO_ALIMTALK"),
      }),
    );
    return addRecipient({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      ...body,
    });
  });
}
