import { NextRequest } from "next/server";
import { logoutCurrent } from "@/modules/auth/service";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { assertRequestOrigin } from "@/lib/api/origin";

export async function POST(request: NextRequest) {
  try {
    assertRequestOrigin(request);
    await logoutCurrent();
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
