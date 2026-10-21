import Link from "next/link";
import { orgText } from "@/modules/admin/org-copy";

export default function AdminNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{orgText("notFoundTitle")}</h1>
      <p className="text-text-body">{orgText("notFoundBody")}</p>
      <Link href="/admin" className="inline-flex h-9 items-center rounded-[14px] bg-primary px-3.5 text-sm font-semibold text-white">
        {orgText("navDashboard")}
      </Link>
    </div>
  );
}
