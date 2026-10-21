import { z } from "zod";
import { requireStaff, handleApiError } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { ANALYTICS_MAX_RANGE_MS, PDF_RATE_LIMIT_MAX, PDF_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { buildProjectPdf } from "@/modules/reports/pdf";
import { orgText } from "@/modules/admin/org-copy";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const ctx = await requireStaff();
    const limited = consumeRateLimit(`pdf:${ctx.user.id}`, PDF_RATE_LIMIT_MAX, PDF_RATE_LIMIT_WINDOW_MS);
    if (!limited.ok) {
      throw new ApiError("RATE_LIMITED", orgText("requestFailed"), 429, undefined, limited.retryAt);
    }
    const { id } = await params;
    const body = await parseJsonBody(
      request,
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      }),
      {},
    );
    const to = body.to ? new Date(body.to) : new Date();
    const from = body.from ? new Date(body.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(to.getTime()) || Number.isNaN(from.getTime()) || from > to) {
      throw new ApiError("VALIDATION_ERROR", orgText("analyticsRangeInvalid"), 400);
    }
    if (to.getTime() - from.getTime() > ANALYTICS_MAX_RANGE_MS) {
      throw new ApiError("VALIDATION_ERROR", orgText("analyticsRangeInvalid"), 400);
    }
    const { bytes, fileName } = await buildProjectPdf({
      organizationId: ctx.organization.id,
      projectId: id,
      actorUserId: ctx.user.id,
      from,
      to,
    });
    const asciiName = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
