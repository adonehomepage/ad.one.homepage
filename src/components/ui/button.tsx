import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "ghost" | "danger";
  loading?: boolean;
};

export function Button({ className, variant = "primary", loading, children, disabled, ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-primary text-on-primary hover:bg-primary-hover",
        variant === "soft" && "bg-primary-soft text-primary-soft-foreground hover:bg-[#d6e8ff]",
        variant === "ghost" && "border border-border bg-white text-text-body hover:bg-surface",
        variant === "danger" && "bg-danger text-white hover:bg-[#c81e2c]",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? "처리 중..." : children}
    </button>
  );
}
