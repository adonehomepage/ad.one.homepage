"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { orgText } from "@/modules/admin/org-copy";

const NAV = [
  { href: "/admin", label: orgText("navDashboard") },
  { href: "/admin/projects", label: orgText("navProjects") },
  { href: "/admin/leads", label: orgText("navLeads"), feature: "leadAdmin" as const },
  { href: "/admin/notifications", label: orgText("navNotifications") },
  { href: "/admin/members", label: orgText("navMembers"), admin: true },
  { href: "/admin/audit-logs", label: orgText("navAudit"), admin: true },
  { href: "/admin/settings", label: orgText("navSettings") },
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
  const [loggingOut, setLoggingOut] = useState(false);
  const items = NAV.filter((item) => {
    if (item.admin && role !== "SYSTEM_ADMIN") return false;
    if (item.feature === "leadAdmin" && !features.leadAdmin) return false;
    return true;
  });

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  if (pathname.includes("/editor") || pathname.endsWith("/projects/new")) {
    return (
      <div className="min-h-screen bg-surface">
        <a
          href="#admin-main"
          className="absolute left-4 top-4 z-50 -translate-y-[200%] rounded-[14px] bg-primary px-4 py-3 text-[17px] font-semibold text-white focus:translate-y-0"
        >
          {orgText("skipToContent")}
        </a>
        <main id="admin-main" className="min-h-screen" tabIndex={-1}>
          {children}
        </main>
      </div>
    );
  }

  function navLink(item: (typeof NAV)[number], onNavigate?: () => void) {
    const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "block rounded-[10px] px-3 py-3 text-sm font-medium",
          active ? "bg-primary-soft text-primary-soft-foreground" : "text-text-body hover:bg-surface",
        )}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#admin-main"
        className="absolute left-4 top-4 z-50 -translate-y-[200%] rounded-[14px] bg-primary px-4 py-3 text-[17px] font-semibold text-white focus:translate-y-0"
      >
        {orgText("skipToContent")}
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border bg-white px-4 py-6 md:block">
        <p className="px-2 text-sm font-semibold text-primary">{brandName}</p>
        <nav className="mt-8 space-y-1" aria-label={orgText("navMenu")}>
          {items.map((item) => navLink(item))}
        </nav>
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-white/75 px-6 py-5 backdrop-blur-md md:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-[10px] border border-border bg-white/80 px-3 py-2 text-sm md:hidden"
              aria-expanded={menuOpen}
              aria-controls="admin-mobile-nav"
              aria-label={orgText("navMenu")}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {orgText("navMenu")}
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{organizationName}</p>
              <p className="truncate text-xs text-text-muted">{userName}</p>
            </div>
          </div>
          <button
            className="shrink-0 text-sm text-text-body hover:text-text-primary disabled:opacity-50"
            onClick={() => void logout()}
            type="button"
            disabled={loggingOut}
            data-testid="logout"
          >
            {loggingOut ? orgText("busy") : orgText("logout")}
          </button>
        </header>
        {menuOpen ? (
          <nav id="admin-mobile-nav" className="space-y-1 border-b border-border bg-white px-4 py-3 md:hidden" aria-label={orgText("navMenu")}>
            <p className="px-3 pb-2 text-xs font-semibold text-primary">{brandName}</p>
            {items.map((item) => navLink(item, () => setMenuOpen(false)))}
          </nav>
        ) : null}
        <main id="admin-main" className="px-6 py-10 md:px-10 md:py-12" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
