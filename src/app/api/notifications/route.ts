import { and, desc, eq } from "drizzle-orm";
import { withStaff } from "@/lib/api/http";
import { db } from "@/lib/db";
import { notificationJobs } from "@/lib/db/schema";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit") ?? 50) || 50), 100);
  return withStaff(async (ctx) => {
    const filters = [eq(notificationJobs.organizationId, ctx.organization.id)];
    if (status) filters.push(eq(notificationJobs.status, status));
    const items = await db
      .select()
      .from(notificationJobs)
      .where(and(...filters))
      .orderBy(desc(notificationJobs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    return { items, page, limit };
  });
}
