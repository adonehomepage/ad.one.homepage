import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/api/http";
import { acceptInvitation } from "@/modules/members/service";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = z.object({ token: z.string(), password: z.string() }).parse(await request.json());
    const user = await acceptInvitation(body.token, body.password);
    const { token } = await createSession(user.id);
    await setSessionCookie(token);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
