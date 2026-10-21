import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { appConfig } from "@/lib/config";
import { extendProject } from "@/modules/publishing/service";
import { orgText } from "@/modules/admin/org-copy";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(
      request,
      z.object({
        additionalMonths: z
          .number()
          .int()
          .min(1, orgText("extendMinMonths"))
          .max(appConfig.maxDurationMonths, orgText("extendMinMonths")),
      }),
    );
    return extendProject({
      organizationId: ctx.organization.id,
      projectId: id,
      userId: ctx.user.id,
      additionalMonths: body.additionalMonths,
    });
  });
}
