import { withStaff } from "@/lib/api/http";
import { createPreviewToken } from "@/lib/auth/preview-token";
import { appConfig } from "@/lib/config";
import { getProject } from "@/modules/projects/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => {
    await getProject(ctx.organization.id, id);
    const token = createPreviewToken(id);
    const base = appConfig.adminUrl.replace(/\/$/, "");
    return { url: `${base}/preview/${encodeURIComponent(token)}` };
  });
}
