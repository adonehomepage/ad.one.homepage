import type { Metadata } from "next";
import { Suspense } from "react";
import { brandLabel } from "@/lib/config";
import { orgText } from "@/modules/admin/org-copy";
import { VerifyRecipientClient } from "@/app/verify-recipient/verify-client";

export const metadata: Metadata = {
  title: orgText("recipientVerifiedTitle"),
  robots: { index: false, follow: false },
};

export default function VerifyRecipientPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-muted">{orgText("loginLoading")}</div>}>
      <VerifyRecipientClient brandName={brandLabel()} />
    </Suspense>
  );
}
