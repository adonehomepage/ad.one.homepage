import { getAuthContext, isSystemAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AuditLogsView } from "@/app/admin/settings/page";

export default async function AuditPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!isSystemAdmin(ctx.member)) redirect("/admin");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">활동 로그</h1>
        <p className="mt-2 text-sm text-text-body">초대, 발행, 삭제, 수신자 변경, 리드 조회/내보내기를 기록합니다.</p>
      </div>
      <AuditLogsView />
    </div>
  );
}
