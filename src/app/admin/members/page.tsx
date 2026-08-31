import { listMembers } from "@/modules/members/service";
import { getAuthContext, isSystemAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { InviteForm } from "@/app/admin/members/invite-form";
import { MemberActions } from "@/app/admin/members/member-actions";
import { formatSeoul } from "@/lib/datetime";

export default async function MembersPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!isSystemAdmin(ctx.member)) redirect("/admin");
  const members = await listMembers(ctx.organization.id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">직원 계정</h1>
        <p className="mt-2 text-sm text-text-body">공개 회원가입은 없습니다. 초대를 받은 직원만 계정을 활성화할 수 있습니다.</p>
      </div>
      <InviteForm />
      <div className="overflow-hidden rounded-2xl bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted">
            <tr>
              <th className="px-4 py-3">이름</th>
              <th className="px-4 py-3">이메일</th>
              <th className="px-4 py-3">역할</th>
              <th className="px-4 py-3">상태</th>
              <th className="px-4 py-3">최근 로그인</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.memberId} className="border-t border-border">
                <td className="px-4 py-3">{member.name}</td>
                <td className="px-4 py-3">{member.email}</td>
                <td className="px-4 py-3">{member.role === "SYSTEM_ADMIN" ? "시스템 관리자" : "직원"}</td>
                <td className="px-4 py-3">
                  <Badge value={member.status} />
                </td>
                <td className="px-4 py-3">{member.lastLoginAt ? formatSeoul(member.lastLoginAt) : "-"}</td>
                <td className="px-4 py-3">
                  <MemberActions memberId={member.memberId} status={member.status} role={member.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
