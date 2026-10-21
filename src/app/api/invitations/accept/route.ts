import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { INVITE_ACCEPT_RATE_LIMIT_MAX, INVITE_ACCEPT_RATE_LIMIT_WINDOW_MS } from "@/lib/constants";
import { ApiError } from "@/lib/errors";
import { acceptInvitation } from "@/modules/members/service";
import { orgText } from "@/modules/admin/org-copy";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const limited = consumeRateLimit(`invite-accept:${ip}`, INVITE_ACCEPT_RATE_LIMIT_MAX, INVITE_ACCEPT_RATE_LIMIT_WINDOW_MS);
    if (!limited.ok) {
      const minutes = Math.max(1, Math.ceil(((limited.retryAt ?? Date.now()) - Date.now()) / 60_000));
      throw new ApiError(
        "RATE_LIMITED",
        orgText("loginRateLimited").replace("{minutes}", String(minutes)),
        429,
        undefined,
        limited.retryAt,
      );
    }
    const body = await parseJsonBody(
      request,
      z.object({
        token: z.string().min(1, orgText("inviteFail")),
        password: z.string().min(1, orgText("inviteFail")),
      }),
    );
    const user = await acceptInvitation(body.token, body.password);
    const { token } = await createSession(user.id);
    await setSessionCookie(token);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
