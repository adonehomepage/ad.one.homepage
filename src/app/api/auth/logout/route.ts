import { logoutCurrent } from "@/modules/auth/service";
import { handleApiError, jsonOk } from "@/lib/api/http";

export async function POST() {
  try {
    await logoutCurrent();
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
