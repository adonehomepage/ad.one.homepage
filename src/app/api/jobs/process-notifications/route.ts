import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { assertCron } from "@/lib/jobs/cron";
import { processNotificationJobs } from "@/modules/lifecycle/service";

export async function POST(request: NextRequest) {
  try {
    assertCron(request);
    const processed = await processNotificationJobs();
    return jsonOk({ processed });
  } catch (error) {
    return handleApiError(error);
  }
}

export const GET = POST;
