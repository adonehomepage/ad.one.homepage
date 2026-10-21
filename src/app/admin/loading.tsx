import { orgText } from "@/modules/admin/org-copy";

export default function AdminLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8" role="status" aria-live="polite">
      <p className="text-sm text-text-muted">{orgText("loginLoading")}</p>
    </div>
  );
}
