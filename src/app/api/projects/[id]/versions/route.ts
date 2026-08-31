import { withStaff } from "@/lib/api/http";
import { listVersions } from "@/modules/publishing/service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  return withStaff(async (ctx) => ({ versions: await listVersions(ctx.organization.id, id) }));
}
