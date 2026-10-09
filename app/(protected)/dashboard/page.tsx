"use client";

import Link from "next/link";
import { useSession } from "@/hooks/use-session";
import { Badge, Card, PageHeader, Spinner } from "@/components/ui";
import { PERMISSION_LABELS, type PermissionCode } from "@/lib/types";

const QUICK_LINKS: { href: string; label: string; description: string; permission: string }[] = [
  { href: "/users", label: "Người dùng", description: "Quản lý tài khoản", permission: "user.read" },
  { href: "/roles", label: "Vai trò", description: "Vai trò & nhóm quyền", permission: "role.read" },
  { href: "/majors", label: "Khoa", description: "Danh mục khoa", permission: "major.read" },
  { href: "/rooms", label: "Phòng", description: "Danh mục phòng", permission: "room.read" },
  {
    href: "/permissions",
    label: "Danh sách quyền",
    description: "Toàn bộ quyền hệ thống",
    permission: "permission.read",
  },
];

function formatDate(value: string): string {
  if (!value) return "—";
  return value.substring(0, 10);
}

function formatDateTime(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("vi-VN");
}

export default function DashboardPage() {
  const { me, permissions, loading, can, refetchPermissions } = useSession();

  if (loading || !me) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  const granted = permissions.filter((p) => p.hasPermission);
  const isAdmin = me.roleName === "Admin";
  const quickLinks = QUICK_LINKS.filter((link) => can(link.permission));

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${me.fullName}`}
        description={
          isAdmin
            ? "Tổng quan hồ sơ và các quyền của bạn trong hệ thống."
            : "Tổng quan hồ sơ của bạn trong hệ thống."
        }
      />

      <div className={isAdmin ? "grid gap-6 lg:grid-cols-3" : "max-w-2xl"}>
        <Card className={isAdmin ? "lg:col-span-1" : ""}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Hồ sơ của tôi
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
              {me.fullName.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="font-medium text-slate-900">{me.fullName}</p>
              <p className="text-sm text-slate-500">{me.email}</p>
            </div>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Vai trò</dt>
              <dd>
                <Badge color={me.roleName === "Admin" ? "brand" : "slate"}>{me.roleName}</Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Số điện thoại</dt>
              <dd className="text-right text-slate-800">{me.phoneNumber || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Địa chỉ</dt>
              <dd className="text-right text-slate-800">{me.address || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Giới tính</dt>
              <dd className="text-slate-800">{me.gender === 1 ? "Nữ" : "Nam"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Ngày sinh</dt>
              <dd className="text-slate-800">{formatDate(me.dob)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Ngày tạo</dt>
              <dd className="text-slate-800">{formatDateTime(me.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Trạng thái</dt>
              <dd>
                <Badge color={me.isActive ? "emerald" : "red"}>
                  {me.isActive ? "Đang hoạt động" : "Bị khóa"}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        {isAdmin ? (
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Quyền của tôi ({granted.length}/{permissions.length})
              </h2>
              <button
                type="button"
                onClick={() => refetchPermissions()}
                className="text-sm text-brand-700 hover:underline"
              >
                Làm mới
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {permissions.map((permission) => (
                <div
                  key={permission.id}
                  className={`rounded-lg border px-4 py-3 ${
                    permission.hasPermission
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">
                      {permission.displayName ||
                        PERMISSION_LABELS[permission.name as PermissionCode] ||
                        permission.name}
                    </span>
                    <Badge color={permission.hasPermission ? "emerald" : "slate"}>
                      {permission.hasPermission ? "Được phép" : "Bị chặn"}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-500">{permission.name}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {permission.setting === "Inherit"
                      ? permission.fromRole
                        ? "Kế thừa từ vai trò"
                        : "Theo vai trò"
                      : `Override: ${permission.setting}`}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      {quickLinks.length > 0 ? (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Truy cập nhanh
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card className="transition hover:border-brand-200 hover:shadow-md">
                  <p className="font-medium text-slate-900">{link.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{link.description}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
