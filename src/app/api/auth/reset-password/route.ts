import { completePasswordReset, requestPasswordReset } from "@/modules/auth/service";
import { handleApiError, jsonOk } from "@/lib/api/http";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.token) {
      await completePasswordReset(String(body.token), String(body.password ?? ""));
      return jsonOk({ ok: true });
    }
    await requestPasswordReset(String(body.email ?? ""));
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
