import { NextRequest, after } from "next/server";
import { z } from "zod";
import { submitPublicLead } from "@/modules/leads/service";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { assertPublicMutationOrigin } from "@/lib/api/origin";
import { parseJsonBody } from "@/lib/api/parse";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { LEAD_RATE_LIMIT_MAX, LEAD_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { slugLookupKey } from "@/lib/validation/slug";
import { orgText } from "@/modules/admin/org-copy";
import { LEAD_ANSWER_VALUE_MAX, LEAD_NAME_MAX } from "@/modules/leads/answers";
import { processNotificationJobs } from "@/modules/lifecycle/service";
import { FORM_FIELD_MAX } from "@/modules/templates/definitions";

type Params = { params: Promise<{ slug: string }> };

const leadAnswerValueSchema = z.union([
  z.string().max(LEAD_ANSWER_VALUE_MAX),
  z.array(z.string().max(LEAD_ANSWER_VALUE_MAX)).max(FORM_FIELD_MAX),
  z.null(),
]);

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    assertPublicMutationOrigin(request);
    const limited = consumeRateLimit(`lead:${ip}:${slug}`, LEAD_RATE_LIMIT_MAX, LEAD_RATE_LIMIT_WINDOW_MS);
    if (!limited.ok) throw new ApiError("RATE_LIMITED", orgText("leadRateLimited"), 429, undefined, limited.retryAt);
    const body = await parseJsonBody(
      request,
      z.object({
        website: z.string().max(200).optional(),
        name: z.string().max(LEAD_NAME_MAX).optional(),
        phone: z.string().max(40).optional(),
        answers: z.record(z.string().max(80), leadAnswerValueSchema).optional(),
        consents: z
          .object({
            collection: z.boolean().optional(),
            thirdParty: z.boolean().optional(),
          })
          .optional(),
        utm: z.record(z.string().max(80), z.string().max(200).optional()).optional(),
        referrer: z.string().max(2_000).nullable().optional(),
      }),
    );
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
    after(() => {
      void processNotificationJobs(50).catch(() => undefined);
    });
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
