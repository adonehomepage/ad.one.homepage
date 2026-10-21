import { cn } from "@/lib/cn";
import { orgText } from "@/modules/admin/org-copy";
import { forwardRef, type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "ghost" | "danger";
  loading?: boolean;
  loadingLabel?: string;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", type = "button", loading, loadingLabel = orgText("busy"), children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-[14px] px-3.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-primary text-on-primary hover:bg-primary-hover",
        variant === "soft" && "bg-primary-soft text-primary-soft-foreground hover:bg-[#d6e8ff]",
        variant === "ghost" && "border border-border bg-white text-text-body hover:bg-surface",
        variant === "danger" && "bg-danger text-white hover:bg-[#c81e2c]",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined}
      {...props}
    >
      {loading ? loadingLabel : children}
    </button>
  );
});
