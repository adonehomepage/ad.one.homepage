import type { Metadata } from "next";
import Link from "next/link";
import { appConfig, brandLabel } from "@/lib/config";
import { orgText } from "@/modules/admin/org-copy";

export const metadata: Metadata = {
  title: orgText("privacyTitle"),
  description: orgText("privacyDescription"),
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const name = appConfig.privacyControllerName || orgText("legalHint");
  const email = appConfig.privacyContactEmail || "";
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium text-primary">{brandLabel()}</p>
      <h1 className="mt-2 text-3xl font-bold">{orgText("privacyTitle")}</h1>
      <p className="mt-6 text-text-body">{orgText("privacyBody").replace("{name}", name)}</p>
      {email ? (
        <p className="mt-4 text-sm text-text-body">
          {orgText("privacyContact")}:{" "}
          <a className="font-medium text-primary" href={`mailto:${email}`}>
            {email}
          </a>
        </p>
      ) : null}
      <p className="mt-10 text-sm text-text-muted">
        <Link href="/terms" className="text-primary">
          {orgText("termsTitle")}
        </Link>
      </p>
    </main>
  );
}
