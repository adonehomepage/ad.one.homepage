import { NextRequest } from "next/server";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { VERIFY_RECIPIENT_RATE_LIMIT_MAX, VERIFY_RECIPIENT_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { verifyRecipient } from "@/modules/recipients/service";
import { orgText } from "@/modules/admin/org-copy";

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limited = consumeRateLimit(
      `verify-recipient:${ip}`,
      VERIFY_RECIPIENT_RATE_LIMIT_MAX,
      VERIFY_RECIPIENT_RATE_LIMIT_WINDOW_MS,
    );
    if (!limited.ok) {
      throw new ApiError("RATE_LIMITED", orgText("requestFailed"), 429, undefined, limited.retryAt);
    }
    const token = new URL(request.url).searchParams.get("token") ?? "";
    await verifyRecipient(token);
    return jsonOk({ ok: true, message: orgText("recipientVerified") });
  } catch (error) {
    return handleApiError(error);
  }
}
