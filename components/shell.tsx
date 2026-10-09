"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/client-auth";
import { useSession } from "@/hooks/use-session";
import { Alert, Button, Spinner } from "@/components/ui";

interface NavItem {
  href: string;
  label: string;
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Tổng quan" },
  { href: "/users", label: "Người dùng", permission: "user.read" },
  { href: "/roles", label: "Vai trò", permission: "role.read" },
  { href: "/permissions", label: "Danh sách quyền", permission: "permission.read" },
  { href: "/majors", label: "Khoa", permission: "major.read" },
  { href: "/rooms", label: "Phòng", permission: "room.read" },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, loading, can, refetch } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      router.push("/login");
      router.refresh();
    } catch (error) {
      setLoggingOut(false);
      if (error && typeof error === "object" && "status" in error && error.status === 401) {
        router.push("/login");
        return;
      }
      setLogoutError(
        error instanceof Error ? error.message : "Đăng xuất thất bại. Vui lòng thử lại.",
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (!me) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <Alert>Không tải được hồ sơ người dùng.</Alert>
        <div className="flex gap-2">
          <Button onClick={() => refetch()}>Thử lại</Button>
          <Button variant="secondary" onClick={() => router.push("/login")}>
            Về trang đăng nhập
          </Button>
        </div>
      </div>
    );
  }

  const items = NAV_ITEMS.filter((item) => !item.permission || can(item.permission));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
                  <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />
                </svg>
              </span>
              <span className="text-lg font-semibold text-slate-900">MediCare</span>
            </Link>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-100"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                {initials(me.fullName) || "U"}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium text-slate-900">{me.fullName}</span>
                <span className="block text-xs text-slate-500">{me.roleName}</span>
              </span>
            </button>

            {menuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
                  <p className="truncate text-sm font-semibold text-slate-900">{me.fullName}</p>
                  <p className="truncate text-xs text-slate-500">{me.email}</p>
                  <p className="mt-2 text-xs text-slate-500">Vai trò: {me.roleName}</p>
                  {logoutError ? (
                    <div className="mt-3">
                      <Alert>{logoutError}</Alert>
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      variant="secondary"
                      loading={loggingOut}
                      onClick={() => handleLogout()}
                    >
                      Đăng xuất
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <nav className="mb-4 flex gap-2 overflow-x-auto md:hidden">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
                    active ? "bg-brand-600 text-white shadow-sm" : "bg-white text-slate-600"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
