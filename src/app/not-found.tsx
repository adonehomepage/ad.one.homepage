import Link from "next/link";
import { brandLabel } from "@/lib/config";
import { orgText } from "@/modules/admin/org-copy";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6 text-center">
      <div>
        <p className="text-sm font-medium text-primary">{brandLabel()}</p>
        <h1 className="mt-2 text-3xl font-bold">{orgText("notFoundTitle")}</h1>
        <p className="mt-3 text-text-body">{orgText("notFoundBody")}</p>
        <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white">
          {orgText("publicHome")}
        </Link>
      </div>
    </main>
  );
}
