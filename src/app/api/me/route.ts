import { requireStaff } from "@/lib/api/http";
import { handleApiError, jsonOk } from "@/lib/api/http";

export async function GET() {
  try {
    const ctx = await requireStaff();
    return jsonOk({
      user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email },
      role: ctx.member.role,
      organization: { id: ctx.organization.id, name: ctx.organization.name },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
