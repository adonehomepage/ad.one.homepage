import { withStaff } from "@/lib/api/http";
import { buildProjectPdf } from "@/modules/reports/pdf";
import { handleApiError } from "@/lib/api/http";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const { requireStaff } = await import("@/lib/api/http");
    const ctx = await requireStaff();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const to = body.to ? new Date(body.to) : new Date();
    const from = body.from ? new Date(body.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const { bytes, fileName } = await buildProjectPdf({
      organizationId: ctx.organization.id,
      projectId: id,
      actorUserId: ctx.user.id,
      from,
      to,
    });
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
