import type { Metadata } from "next";
import { headers } from "next/headers";
import { clearSessionCookie, getAuthContext, isActiveMember } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/layout/admin-shell";
import { featureFlags } from "@/lib/feature-flags";
import { brandLabel } from "@/lib/config";
import { orgText } from "@/modules/admin/org-copy";
import { safeNextPath } from "@/lib/auth/safe-next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: orgText("navDashboard"),
  robots: { index: false, follow: false },
};

async function loginRedirect(extra?: Record<string, string>, clearCookie = false): Promise<never> {
  if (clearCookie) await clearSessionCookie();
  const headerStore = await headers();
  const next = safeNextPath(headerStore.get("x-pathname"), "/admin");
  const params = new URLSearchParams({ next, ...extra });
  redirect(`/login?${params.toString()}`);
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAuthContext();
  if (!ctx) return loginRedirect(undefined, true);
  if (ctx.user.status === "SUSPENDED" || ctx.member.status === "SUSPENDED") {
    return loginRedirect({ error: "suspended" }, true);
  }
  if (!isActiveMember(ctx.member) || ctx.user.status !== "ACTIVE") {
    return loginRedirect(undefined, true);
  }
  const flags = featureFlags();
  return (
    <AdminShell
      brandName={brandLabel()}
      organizationName={ctx.organization.name}
      userName={ctx.user.name}
      role={ctx.member.role}
      features={{ leadAdmin: flags.leadAdmin }}
    >
      {children}
    </AdminShell>
  );
}
