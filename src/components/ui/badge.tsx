import { cn } from "@/lib/cn";
import { orgText } from "@/modules/admin/org-copy";

const styles: Record<string, string> = {
  DRAFT: "bg-surface text-text-body",
  PUBLISHED: "bg-primary-soft text-primary-soft-foreground",
  PAUSED: "bg-[#fff3e0] text-[#c67c00]",
  EXPIRED: "bg-[#fdeeee] text-danger",
  PENDING_DELETION: "bg-[#fdeeee] text-danger",
  ACTIVE: "bg-primary-soft text-primary-soft-foreground",
  SUSPENDED: "bg-[#fdeeee] text-danger",
  INVITED: "bg-surface text-text-body",
  SENT: "bg-primary-soft text-primary-soft-foreground",
  FAILED: "bg-[#fdeeee] text-danger",
  QUEUED: "bg-surface text-text-body",
};

const labels: Record<string, string> = {
  DRAFT: orgText("badgeDraft"),
  PUBLISHED: orgText("badgePublished"),
  PAUSED: orgText("badgePaused"),
  EXPIRED: orgText("badgeExpired"),
  PENDING_DELETION: orgText("badgePending"),
  ACTIVE: orgText("badgeActive"),
  SUSPENDED: orgText("badgeSuspended"),
  INVITED: orgText("badgeInvited"),
  SENT: orgText("badgeSent"),
  FAILED: orgText("badgeFailed"),
  QUEUED: orgText("badgeQueued"),
};

export function badgeLabels(settings: Record<string, unknown>) {
  const text = (key: string, fallback: string) => String(settings[key] ?? "").trim() || fallback;
  return {
    DRAFT: text("badgeDraft", labels.DRAFT),
    PUBLISHED: text("badgePublished", labels.PUBLISHED),
    PAUSED: text("badgePaused", labels.PAUSED),
    EXPIRED: text("badgeExpired", labels.EXPIRED),
    PENDING_DELETION: text("badgePending", labels.PENDING_DELETION),
    ACTIVE: text("badgeActive", labels.ACTIVE),
    SUSPENDED: text("badgeSuspended", labels.SUSPENDED),
    INVITED: text("badgeInvited", labels.INVITED),
    SENT: text("badgeSent", labels.SENT),
    FAILED: text("badgeFailed", labels.FAILED),
    QUEUED: text("badgeQueued", labels.QUEUED),
  };
}

export function Badge({ value, labels: custom }: { value: string; labels?: Record<string, string> }) {
  const label = custom?.[value] || labels[value] || value;
  return (
    <span
      role="status"
      aria-label={orgText("badgeStatus").replace("{label}", label)}
      className={cn("inline-flex rounded-[8px] px-2.5 py-1 text-xs font-medium", styles[value] ?? "bg-surface text-text-body")}
    >
      {label}
    </span>
  );
}
