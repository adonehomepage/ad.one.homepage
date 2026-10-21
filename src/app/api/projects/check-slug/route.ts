import { withStaff } from "@/lib/api/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { ApiError } from "@/lib/errors";
import { checkSlugAvailable } from "@/modules/projects/service";
import { orgText } from "@/modules/admin/org-copy";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const value = url.searchParams.get("value") ?? "";
  const exceptProjectId = url.searchParams.get("exceptProjectId") ?? undefined;
  return withStaff(async (ctx) => {
    const limited = consumeRateLimit(`check-slug:${ctx.user.id}`, 60, 60_000);
    if (!limited.ok) {
      throw new ApiError("RATE_LIMITED", orgText("requestFailed"), 429, undefined, limited.retryAt);
    }
    const parsed = await checkSlugAvailable(value, exceptProjectId);
    return { available: true, slug: parsed.value };
  });
}
