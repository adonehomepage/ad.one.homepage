"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { brandLabel } from "@/lib/config";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/projects", label: "홈페이지" },
  { href: "/admin/leads", label: "관심고객", feature: "leadAdmin" as const },
  { href: "/admin/notifications", label: "알림 로그" },
  { href: "/admin/members", label: "직원 계정", admin: true },
  { href: "/admin/audit-logs", label: "활동 로그", admin: true },
  { href: "/admin/settings", label: "설정" },
];

export function AdminShell({
  children,
  organizationName,
  userName,
  role,
  features = { leadAdmin: true },
}: {
  children: React.ReactNode;
  organizationName: string;
  userName: string;
  role: string;
  features?: { leadAdmin: boolean };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV.filter((item) => {
    if (item.admin && role !== "SYSTEM_ADMIN") return false;
    if (item.feature === "leadAdmin" && !features.leadAdmin) return false;
    return true;
  });

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-white px-4 py-6 md:block">
        <p className="px-2 text-sm font-semibold text-primary">{brandLabel()}</p>
        <nav className="mt-8 space-y-1">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-primary-soft text-primary-soft-foreground" : "text-text-body hover:bg-surface",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="md:pl-60">
        <header className="flex items-center justify-between border-b border-border bg-white px-6 py-4">
          <div>
            <p className="text-sm font-medium">{organizationName}</p>
            <p className="text-xs text-text-muted">{userName}</p>
          </div>
          <button className="text-sm text-text-body hover:text-text-primary" onClick={logout} type="button">
            로그아웃
          </button>
        </header>
        <main className="px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
