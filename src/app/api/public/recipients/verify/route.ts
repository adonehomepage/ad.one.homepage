import { handleApiError, jsonOk } from "@/lib/api/http";
import { verifyRecipient } from "@/modules/recipients/service";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    await verifyRecipient(token);
    return jsonOk({ ok: true, message: "수신 연락처 인증이 완료되었습니다." });
  } catch (error) {
    return handleApiError(error);
  }
}
