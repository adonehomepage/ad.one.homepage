"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

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
  brandName,
  organizationName,
  userName,
  role,
  features = { leadAdmin: true },
}: {
  children: React.ReactNode;
  brandName: string;
  organizationName: string;
  userName: string;
  role: string;
  features?: { leadAdmin: boolean };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
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

  if (pathname.includes("/editor")) {
    return <div className="min-h-screen bg-surface">{children}</div>;
  }

  function navLink(item: (typeof NAV)[number], onNavigate?: () => void) {
    const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "block rounded-lg px-3 py-2 text-sm font-medium",
          active ? "bg-primary-soft text-primary-soft-foreground" : "text-text-body hover:bg-surface",
        )}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-white px-4 py-6 md:block">
        <p className="px-2 text-sm font-semibold text-primary">{brandName}</p>
        <nav className="mt-8 space-y-1">{items.map((item) => navLink(item))}</nav>
      </aside>
      <div className="md:pl-60">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm md:hidden"
              aria-expanded={menuOpen}
              aria-label="메뉴"
              onClick={() => setMenuOpen((open) => !open)}
            >
              메뉴
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{organizationName}</p>
              <p className="truncate text-xs text-text-muted">{userName}</p>
            </div>
          </div>
          <button className="shrink-0 text-sm text-text-body hover:text-text-primary" onClick={logout} type="button">
            로그아웃
          </button>
        </header>
        {menuOpen ? (
          <nav className="space-y-1 border-b border-border bg-white px-4 py-3 md:hidden">
            <p className="px-3 pb-2 text-xs font-semibold text-primary">{brandName}</p>
            {items.map((item) => navLink(item, () => setMenuOpen(false)))}
          </nav>
        ) : null}
        <main className="px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
