import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { brandLabel } from "@/lib/config";
import { safeNextPath } from "@/lib/auth/safe-next";
import { getAuthContext, isActiveMember } from "@/lib/auth/session";
import { orgText } from "@/modules/admin/org-copy";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = {
  title: orgText("loginTitle"),
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const ctx = await getAuthContext();
  if (ctx && isActiveMember(ctx.member) && ctx.user.status === "ACTIVE") {
    redirect(safeNextPath(params.next));
  }
  return <LoginForm brandName={brandLabel()} />;
}
