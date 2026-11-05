"use client";

import { cn } from "@/lib/cn";
import { orgText } from "@/modules/admin/org-copy";
import { createContext, forwardRef, useContext, type ButtonHTMLAttributes, type ReactNode } from "react";

const ButtonScaleContext = createContext<"lg" | "sm">("lg");

export function ButtonScaleProvider({ scale, children }: { scale: "lg" | "sm"; children: ReactNode }) {
  return <ButtonScaleContext.Provider value={scale}>{children}</ButtonScaleContext.Provider>;
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "soft" | "ghost" | "danger";
  scale?: "lg" | "sm";
  loading?: boolean;
  loadingLabel?: string;
};

const scaleClass = {
  lg: "h-12 rounded-[14px] px-4 text-[17px]",
  sm: "h-9 rounded-[14px] px-3 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", scale, type = "button", loading, loadingLabel = orgText("busy"), children, disabled, ...props },
  ref,
) {
  const contextScale = useContext(ButtonScaleContext);
  const resolved = scale ?? contextScale;
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
        scaleClass[resolved],
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
