import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { trackEvent } from "@/modules/analytics/service";
import { getPublishedBySlug } from "@/modules/publishing/service";
import { slugLookupKey } from "@/lib/validation/slug";
import type { AnalyticsEventName } from "@/types";

const schema = z.object({
  slug: z.string(),
  eventName: z.enum([
    "page_view",
    "session_start",
    "gnb_click",
    "section_view",
    "phone_click",
    "lead_cta_click",
    "lead_form_start",
    "lead_submit_success",
    "lead_submit_error",
  ]),
  anonymousSessionId: z.string().optional(),
  anonymousVisitorId: z.string().optional(),
  referrer: z.string().nullable().optional(),
  utm: z.record(z.string(), z.string().optional()).optional(),
  deviceType: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const published = await getPublishedBySlug(slugLookupKey(body.slug));
    if (!published) return jsonOk({ ok: true });
    await trackEvent({
      organizationId: published.project.organizationId,
      projectId: published.project.id,
      publishedVersionId: published.version.id,
      eventName: body.eventName as AnalyticsEventName,
      anonymousSessionId: body.anonymousSessionId,
      anonymousVisitorId: body.anonymousVisitorId,
      referrer: body.referrer,
      utm: body.utm,
      deviceType: body.deviceType,
      metadata: body.metadata,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
