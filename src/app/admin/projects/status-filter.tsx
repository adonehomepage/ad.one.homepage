"use client";

import { useRouter } from "next/navigation";
import { orgText } from "@/modules/admin/org-copy";
import { cn } from "@/lib/cn";

const MORE = [
  { value: "PAUSED", label: orgText("badgePaused") },
  { value: "EXPIRED", label: orgText("badgeExpired") },
  { value: "PENDING_DELETION", label: orgText("badgePending") },
  { value: "expiring", label: orgText("cardExpiring") },
];

export function ProjectMoreFilter({ status, expiring }: { status?: string; expiring?: string }) {
  const router = useRouter();
  const current = expiring === "1" ? "expiring" : MORE.some((item) => item.value === status) ? (status ?? "") : "";

  return (
    <span className="relative inline-flex h-8 items-center">
      <select
        aria-label={orgText("filterMore")}
        className={cn(
          "h-8 appearance-none rounded-full border bg-white pl-3 pr-8 text-[13px] font-semibold leading-8",
          current ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-text-body",
        )}
        value={current}
        onChange={(event) => {
          const value = event.target.value;
          if (value === "expiring") {
            router.push("/admin/projects?expiring=1");
            return;
          }
          router.push(value ? `/admin/projects?status=${value}` : "/admin/projects");
        }}
      >
        <option value="">{orgText("filterMore")}</option>
        {MORE.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <svg
        className={cn("pointer-events-none absolute right-2.5 size-3.5", current ? "text-primary-soft-foreground" : "text-text-muted")}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </span>
  );
}
