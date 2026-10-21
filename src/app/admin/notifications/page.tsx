import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notificationJobs } from "@/lib/db/schema";
import { getAuthContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatSeoul } from "@/lib/datetime";
import { RetryButton } from "@/app/admin/notifications/retry-button";
import { orgText } from "@/modules/admin/org-copy";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 50;

const STATUS_FILTERS = [
  { value: "", labelKey: "filterAll" as const },
  { value: "FAILED", labelKey: "badgeFailed" as const },
  { value: "SENT", labelKey: "badgeSent" as const },
  { value: "QUEUED", labelKey: "badgeQueued" as const },
];

function channelLabel(channel: string) {
  if (channel === "KAKAO_ALIMTALK") return orgText("channelKakao");
  if (channel === "EMAIL") return orgText("channelEmail");
  return channel;
}

function eventLabel(eventType: string) {
  if (eventType === "LEAD_REGISTERED") return orgText("eventLead");
  if (eventType === "EXPIRY_NOTICE") return orgText("eventExpiry");
  return eventType;
}

function notificationsQuery(params: { status?: string; page?: number }) {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.page && params.page > 1) query.set("page", String(params.page));
  const qs = query.toString();
  return qs ? `/admin/notifications?${qs}` : "/admin/notifications";
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  const params = await searchParams;
  const status = params.status;
  const page = Math.max(1, Number(params.page) || 1);
  const filters = [eq(notificationJobs.organizationId, ctx.organization.id)];
  if (status) filters.push(eq(notificationJobs.status, status));
  const items = await db
    .select()
    .from(notificationJobs)
    .where(and(...filters))
    .orderBy(desc(notificationJobs.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  const hasPrev = page > 1;
  const hasNext = items.length === PAGE_SIZE;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{orgText("navNotifications")}</h1>
        <p className="mt-2 text-sm text-text-body">{orgText("notificationsBody")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const active = (status ?? "") === filter.value;
            const href = filter.value ? `/admin/notifications?status=${filter.value}` : "/admin/notifications";
            return (
              <Link
                key={filter.labelKey}
                href={href}
                className={cn(
                  "inline-flex h-12 items-center rounded-[14px] border px-4 text-[17px] font-semibold",
                  active ? "border-primary bg-primary-soft text-primary" : "border-border bg-white text-text-body",
                )}
              >
                {orgText(filter.labelKey)}
              </Link>
            );
          })}
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState title={orgText("notificationsEmptyTitle")} description={orgText("notificationsEmpty")} />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between ui-card">
              <div>
                <p className="font-medium">
                  {eventLabel(item.eventType)} · {channelLabel(item.channel)}
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
      )}
      {hasPrev || hasNext ? (
        <div className="flex items-center justify-between gap-3">
          {hasPrev ? (
            <Link href={notificationsQuery({ status, page: page - 1 })} className="text-[17px] font-semibold text-primary">
              {orgText("pagePrev")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-text-muted">{orgText("pageStatus").replace("{page}", String(page))}</span>
          {hasNext ? (
            <Link href={notificationsQuery({ status, page: page + 1 })} className="text-[17px] font-semibold text-primary">
              {orgText("pageNext")}
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
