import { withStaff } from "@/lib/api/http";
import { ANALYTICS_MAX_RANGE_MS } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { getProjectAnalytics } from "@/modules/analytics/service";
import { orgText } from "@/modules/admin/org-copy";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const url = new URL(request.url);
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  return withStaff(async (ctx) => {
    if (Number.isNaN(to.getTime()) || Number.isNaN(from.getTime()) || from > to) {
      throw new ApiError("VALIDATION_ERROR", orgText("analyticsRangeInvalid"), 400);
    }
    if (to.getTime() - from.getTime() > ANALYTICS_MAX_RANGE_MS) {
      throw new ApiError("VALIDATION_ERROR", orgText("analyticsRangeInvalid"), 400);
    }
    return getProjectAnalytics(ctx.organization.id, id, from, to);
  });
}
