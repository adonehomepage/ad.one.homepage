import { desc, eq } from "drizzle-orm";
import { withStaff } from "@/lib/api/http";
import { db } from "@/lib/db";
import { notificationJobs } from "@/lib/db/schema";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  return withStaff(async (ctx) => {
    const rows = await db
      .select()
      .from(notificationJobs)
      .where(eq(notificationJobs.organizationId, ctx.organization.id))
      .orderBy(desc(notificationJobs.createdAt))
      .limit(100);
    return { items: status ? rows.filter((row) => row.status === status) : rows };
  });
}
