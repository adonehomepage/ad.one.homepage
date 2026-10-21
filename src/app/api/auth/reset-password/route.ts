import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { ApiError } from "@/lib/errors";
import { completePasswordReset, requestPasswordReset } from "@/modules/auth/service";
import { orgText } from "@/modules/admin/org-copy";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(
      request,
      z.object({
        token: z.string().optional(),
        password: z.string().optional(),
        email: z.string().optional(),
      }),
    );
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (body.token) {
      if (!body.password) {
        throw new ApiError("VALIDATION_ERROR", orgText("requestFailed"), 400);
      }
      await completePasswordReset(body.token, body.password, ip);
      return jsonOk({ ok: true });
    }
    const result = await requestPasswordReset(String(body.email ?? ""), ip);
    return jsonOk({ ok: true, ...(result ?? {}) });
  } catch (error) {
    return handleApiError(error);
  }
}
