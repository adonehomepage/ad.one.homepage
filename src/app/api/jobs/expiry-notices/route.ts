import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { assertCron } from "@/lib/jobs/cron";
import { enqueueExpiryNotices } from "@/modules/lifecycle/service";

export async function POST(request: NextRequest) {
  try {
    assertCron(request);
    await enqueueExpiryNotices();
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = POST;
