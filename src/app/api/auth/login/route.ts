import { NextRequest } from "next/server";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { parseJsonBody } from "@/lib/api/parse";
import { loginWithEmail } from "@/modules/auth/service";
import { orgText } from "@/modules/admin/org-copy";

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(
      request,
      z
        .object({
          loginId: z.string().optional(),
          email: z.string().optional(),
          password: z.string().min(1, orgText("requestFailed")),
        })
        .refine((value) => Boolean((value.loginId ?? value.email ?? "").trim()), {
          message: orgText("requestFailed"),
        }),
    );
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const user = await loginWithEmail(String(body.loginId ?? body.email ?? ""), body.password, ip);
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
