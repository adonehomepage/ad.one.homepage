import Link from "next/link";
import { Button } from "@/components/ui/button";
import { orgText } from "@/modules/admin/org-copy";

export default function AdminNotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{orgText("notFoundTitle")}</h1>
      <p className="text-text-body">{orgText("notFoundBody")}</p>
      <Link href="/admin">
        <Button>{orgText("navDashboard")}</Button>
      </Link>
    </div>
  );
}
