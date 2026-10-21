import Link from "next/link";
import { orgText } from "@/modules/admin/org-copy";

export default function AdminNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-3xl font-bold">{orgText("notFoundTitle")}</h1>
      <p className="text-text-body">{orgText("notFoundBody")}</p>
      <Link href="/admin" className="inline-flex h-12 items-center rounded-[14px] bg-primary px-5 text-[17px] font-semibold text-white">
        {orgText("navDashboard")}
      </Link>
    </div>
  );
}
