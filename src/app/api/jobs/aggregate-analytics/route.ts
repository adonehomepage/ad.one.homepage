import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { assertCron, cronSkipPayload, shouldSkipCronWork } from "@/lib/jobs/cron";
import { aggregateAnalytics } from "@/modules/analytics/service";

export async function POST(request: NextRequest) {
  try {
    assertCron(request);
    if (shouldSkipCronWork()) return jsonOk(cronSkipPayload());
    await aggregateAnalytics();
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = POST;
