import { z } from "zod";
import { withStaff } from "@/lib/api/http";
import { checkSlugAvailable, createProject, listProjects } from "@/modules/projects/service";
import { TEMPLATE_CODES } from "@/lib/constants";
import { appConfig } from "@/lib/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return withStaff(async (ctx) =>
    listProjects({
      organizationId: ctx.organization.id,
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      expiringSoon: url.searchParams.get("expiring") === "1",
      page: Number(url.searchParams.get("page") ?? 1),
    }),
  );
}

export async function POST(request: Request) {
  const body = z.object({
    name: z.string(),
    publicSlug: z.string(),
    templateCode: z.enum(TEMPLATE_CODES),
    durationMonths: z.number().int().min(1).default(appConfig.defaultDurationMonths),
  }).parse(await request.json());
  return withStaff(async (ctx) => {
    const project = await createProject({
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      ...body,
    });
    return { project };
  });
}
