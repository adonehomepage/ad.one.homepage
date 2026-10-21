import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { createProject, listProjects } from "@/modules/projects/service";
import { TEMPLATE_CODES } from "@/lib/constants";
import { appConfig } from "@/lib/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? 1);
  return withStaff(async (ctx) =>
    listProjects({
      organizationId: ctx.organization.id,
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      expiringSoon: url.searchParams.get("expiring") === "1",
      page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    }),
  );
}

export async function POST(request: Request) {
  return withStaff(async (ctx) => {
    const body = await parseJsonBody(
      request,
      z.object({
        name: z.string().trim().min(1),
        publicSlug: z.string().trim().min(1),
        templateCode: z.enum(TEMPLATE_CODES),
        durationMonths: z.number().int().min(1).max(appConfig.maxDurationMonths).default(appConfig.defaultDurationMonths),
        phone: z.string().optional(),
      }),
    );
    const project = await createProject({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      ...body,
    });
    return { project };
  });
}
