import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { addRecipient, listRecipients } from "@/modules/recipients/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => ({ recipients: await listRecipients(ctx.organization.id, id) }));
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const body = z.object({
    name: z.string(),
    companyName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    preferredChannel: z.enum(["KAKAO_ALIMTALK", "EMAIL"]).default("KAKAO_ALIMTALK"),
  }).parse(await request.json());
  return withStaff(async (ctx) =>
    addRecipient({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      ...body,
    }),
  );
}
