import { cn } from "@/lib/cn";

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
  DRAFT: "미발행",
  PUBLISHED: "공개 중",
  PAUSED: "비공개",
  EXPIRED: "만료됨",
  PENDING_DELETION: "삭제 대기",
  ACTIVE: "활성",
  SUSPENDED: "정지",
  INVITED: "초대됨",
  SENT: "발송 성공",
  FAILED: "실패",
  QUEUED: "대기",
};

export function Badge({ value }: { value: string }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", styles[value] ?? "bg-surface text-text-body")}>
      {labels[value] ?? value}
    </span>
  );
}
