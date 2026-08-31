import { getAuthContext, isActiveMember } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");
  if (ctx.user.status === "SUSPENDED" || ctx.member.status === "SUSPENDED") {
    redirect("/login?error=suspended");
  }
  if (!isActiveMember(ctx.member) || ctx.user.status !== "ACTIVE") {
    redirect("/login");
  }
  return (
    <AdminShell organizationName={ctx.organization.name} userName={ctx.user.name} role={ctx.member.role}>
      {children}
    </AdminShell>
  );
}
