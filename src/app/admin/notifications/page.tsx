import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationJobs } from "@/lib/db/schema";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { formatSeoul } from "@/lib/datetime";
import { RetryButton } from "@/app/admin/notifications/retry-button";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const { status } = await searchParams;
  const rows = await db
    .select()
    .from(notificationJobs)
    .where(eq(notificationJobs.organizationId, ctx.organization.id))
    .orderBy(desc(notificationJobs.createdAt))
    .limit(100);
  const items = status ? rows.filter((row) => row.status === status) : rows;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">알림 로그</h1>
        <p className="mt-2 text-sm text-text-body">발송 실패는 리드 저장과 분리됩니다. 메시지 원문은 남기지 않습니다.</p>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
            <div>
              <p className="font-medium">
                {item.eventType} · {item.channel}
              </p>
              <p className="text-sm text-text-muted">
                {formatSeoul(item.createdAt)} {item.errorMessageRedacted ?? ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge value={item.status} />
              {item.status === "FAILED" ? <RetryButton id={item.id} /> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
