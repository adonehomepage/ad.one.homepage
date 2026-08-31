import { NextRequest } from "next/server";
import { submitPublicLead } from "@/modules/leads/service";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { LEAD_RATE_LIMIT_MAX, LEAD_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { slugLookupKey } from "@/lib/validation/slug";

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const origin = request.headers.get("origin");
    if (origin && !origin.includes(new URL(request.url).host)) {
      throw new ApiError("FORBIDDEN", "허용되지 않은 요청입니다.", 403);
    }
    const limited = consumeRateLimit(`lead:${ip}:${slug}`, LEAD_RATE_LIMIT_MAX, LEAD_RATE_LIMIT_WINDOW_MS);
    if (!limited.ok) throw new ApiError("RATE_LIMITED", "잠시 후 다시 시도해 주세요.", 429);
    const body = await request.json();
    if (body.website) {
      return jsonOk({ ok: true });
    }
    const result = await submitPublicLead({
      slug: slugLookupKey(decodeURIComponent(slug)),
      name: String(body.name ?? ""),
      phone: String(body.phone ?? ""),
      answers: body.answers ?? {},
      consents: { collection: Boolean(body.consents?.collection), thirdParty: Boolean(body.consents?.thirdParty) },
      utm: body.utm,
      referrer: body.referrer ?? request.headers.get("referer"),
      ip,
      userAgent: request.headers.get("user-agent"),
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
