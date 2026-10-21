import type { Metadata } from "next";
import { Suspense } from "react";
import { brandLabel } from "@/lib/config";
import { orgText } from "@/modules/admin/org-copy";
import { ResetForm } from "@/app/reset-password/reset-form";

export const metadata: Metadata = {
  title: orgText("resetTitle"),
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-muted">{orgText("loginLoading")}</div>}>
      <ResetForm brandName={brandLabel()} />
    </Suspense>
  );
}
