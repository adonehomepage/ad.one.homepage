import { NextRequest } from "next/server";
import { loginWithEmail } from "@/modules/auth/service";
import { handleApiError, jsonOk } from "@/lib/api/http";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const user = await loginWithEmail(String(body.loginId ?? body.email ?? ""), String(body.password ?? ""), ip);
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
