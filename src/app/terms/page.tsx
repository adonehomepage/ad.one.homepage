import type { Metadata } from "next";
import Link from "next/link";
import { brandLabel } from "@/lib/config";
import { orgText } from "@/modules/admin/org-copy";

export const metadata: Metadata = {
  title: orgText("termsTitle"),
  description: orgText("termsDescription"),
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium text-primary">{brandLabel()}</p>
      <h1 className="mt-2 text-3xl font-bold">{orgText("termsTitle")}</h1>
      <p className="mt-6 text-text-body">{orgText("termsBody")}</p>
      <p className="mt-10 text-sm text-text-muted">
        <Link href="/privacy" className="text-primary">
          {orgText("privacyTitle")}
        </Link>
      </p>
    </main>
  );
}
