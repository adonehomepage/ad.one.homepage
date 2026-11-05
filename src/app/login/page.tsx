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
  // DB가 일시 불가면 세션 조회 실패로 로그인 화면 자체가 깨지지 않게 한다.
  let ctx: Awaited<ReturnType<typeof getAuthContext>> = null;
  try {
    ctx = await getAuthContext();
  } catch {
    ctx = null;
  }
  if (ctx && isActiveMember(ctx.member) && ctx.user.status === "ACTIVE") {
    redirect(safeNextPath(params.next));
  }
  return <LoginForm brandName={brandLabel()} />;
}
