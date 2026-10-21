import type { Metadata } from "next";
import Link from "next/link";
import { brandLabel } from "@/lib/config";
import { orgText } from "@/modules/admin/org-copy";

export const metadata: Metadata = {
  title: orgText("homeMetaTitle"),
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-center">
      <p className="text-sm font-medium text-primary">{brandLabel()}</p>
      <h1 className="mt-3 max-w-xl text-4xl font-bold break-keep">
        {orgText("homeTitle")
          .split("\n")
          .map((line, index) => (
            <span key={line}>
              {index > 0 ? <br /> : null}
              {line}
            </span>
          ))}
      </h1>
      <p className="mt-4 max-w-lg text-text-body">{orgText("homeBody")}</p>
      <Link href="/login" className="mt-8 inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white">
        {orgText("homeLogin")}
      </Link>
      <p className="mt-10 flex gap-4 text-sm text-text-muted">
        <Link href="/privacy" className="hover:text-text-body">
          {orgText("privacyTitle")}
        </Link>
        <Link href="/terms" className="hover:text-text-body">
          {orgText("termsTitle")}
        </Link>
      </p>
    </div>
  );
}
