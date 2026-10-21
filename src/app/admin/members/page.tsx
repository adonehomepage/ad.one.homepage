import { listMembers } from "@/modules/members/service";
import { getAuthContext, isSystemAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { InviteForm } from "@/app/admin/members/invite-form";
import { MemberActions } from "@/app/admin/members/member-actions";
import { formatSeoul } from "@/lib/datetime";
import { orgText } from "@/modules/admin/org-copy";

export default async function MembersPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (!isSystemAdmin(ctx.member)) redirect("/admin");
  const members = await listMembers(ctx.organization.id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{orgText("navMembers")}</h1>
        <p className="mt-2 text-sm text-text-body">{orgText("membersBody")}</p>
      </div>
      <InviteForm />
      {members.length === 0 ? (
        <EmptyState title={orgText("membersEmptyTitle")} description={orgText("membersEmptyBody")} />
      ) : (
        <div className="ui-table">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-text-muted">
              <tr>
                <th className="px-4 py-3">{orgText("colName")}</th>
                <th className="px-4 py-3">{orgText("colEmail")}</th>
                <th className="px-4 py-3">{orgText("colRole")}</th>
                <th className="px-4 py-3">{orgText("colStatus")}</th>
                <th className="px-4 py-3">{orgText("colLastLogin")}</th>
                <th className="px-4 py-3">{orgText("colManage")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.memberId} className="border-t border-border">
                  <td className="px-4 py-3">{member.name}</td>
                  <td className="px-4 py-3">{member.email}</td>
                  <td className="px-4 py-3">{member.role === "SYSTEM_ADMIN" ? orgText("roleAdmin") : orgText("roleMember")}</td>
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
      )}
    </div>
  );
}
