import { requireStaff, handleApiError } from "@/lib/api/http";
import { assertRequestOrigin } from "@/lib/api/origin";
import { parseJsonBody } from "@/lib/api/parse";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { EXPORT_RATE_LIMIT_MAX, EXPORT_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { requireLeadAdmin } from "@/lib/feature-guard";
import { exportLeads } from "@/modules/leads/service";
import { orgText } from "@/modules/admin/org-copy";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const ctx = await requireStaff();
    assertRequestOrigin(request);
    requireLeadAdmin();
    await parseJsonBody(request, z.object({}).passthrough(), {});
    const limited = consumeRateLimit(`export:${ctx.user.id}`, EXPORT_RATE_LIMIT_MAX, EXPORT_RATE_LIMIT_WINDOW_MS);
    if (!limited.ok) {
      throw new ApiError("RATE_LIMITED", orgText("requestFailed"), 429, undefined, limited.retryAt);
    }
    const { id } = await params;
    const csv = await exportLeads({ organizationId: ctx.organization.id, projectId: id, actorUserId: ctx.user.id });
    const fileName = `leads-${id}.csv`;
    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
