"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError, messageFor } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import { Forbidden } from "@/components/forbidden";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";
import type {
  MePermission,
  PagedUsers,
  PermissionChange,
  PermissionSetting,
  RoleResponse,
  UserResponse,
} from "@/lib/types";

function formatDate(value: string): string {
  if (!value) return "—";
  return value.substring(0, 10);
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { me, can, loading: sessionLoading, permissions: myPermissions, displayNameOf } = useSession();

  const id = params.id;

  const [user, setUser] = useState<UserResponse | null>(null);
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [userPermissions, setUserPermissions] = useState<MePermission[]>([]);
  const [effects, setEffects] = useState<Record<string, PermissionSetting>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [roleMessage, setRoleMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState<{
    tone: "error" | "success";
    text: string;
  } | null>(null);

  const canUpdate = can("user.update");
  const canReadRoles = can("role.read");
  const isSelf = me?.id === id;
  const isLastAdmin = adminCount === 1 && user?.roleName === "Admin";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await apiFetch<UserResponse>(`/api/users/${id}`);
      setUser(profile);
      setSelectedRoleId(profile.roleId);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setForbidden(true);
      else setError(messageFor(err, "Không tải được thông tin người dùng."));
      setUser(null);
    }

    try {
      const list = await apiFetch<MePermission[]>(`/api/users/${id}/permissions`);
      setUserPermissions(list);
      setEffects(Object.fromEntries(list.map((p) => [p.id, p.setting])) as Record<string, PermissionSetting>);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setForbidden(true);
      else setError((prev) => prev ?? messageFor(err, "Không tải được danh sách quyền."));
      setUserPermissions([]);
    }

    if (canReadRoles) {
      try {
        setRoles(await apiFetch<RoleResponse[]>("/api/roles"));
      } catch {
        setRoles([]);
      }
    }

    // §5.2: chặn hạ vai trò Admin cuối cùng — đếm được chỉ khi lấy đủ danh sách (≤100 user).
    try {
      const paged = await apiFetch<PagedUsers>("/api/users?page=1&pageSize=100");
      setAdminCount(
        paged.totalCount <= paged.items.length
          ? paged.items.filter((u) => u.roleName === "Admin").length
          : null,
      );
    } catch {
      setAdminCount(null);
    }

    setLoading(false);
  }, [id, canReadRoles]);

  useEffect(() => {
    if (!sessionLoading) void load();
  }, [sessionLoading, load]);

  const overrideCount = userPermissions.filter((p) => p.setting !== "Inherit").length;
  const dirtyPermissions = userPermissions.filter((p) => effects[p.id] && effects[p.id] !== p.setting);

  async function confirmChangeRole() {
    setSavingRole(true);
    setRoleMessage(null);
    try {
      await apiFetch(`/api/users/${id}/role`, {
        method: "PUT",
        body: JSON.stringify({ roleId: selectedRoleId }),
      });
      setConfirmOpen(false);
      setRoleMessage({ tone: "success", text: "Đã cập nhật vai trò thành công." });
      await load();
    } catch (err) {
      setRoleMessage({ tone: "error", text: messageFor(err, "Không đổi được vai trò.") });
      if (err instanceof ApiError && err.status === 403) setConfirmOpen(false);
    } finally {
      setSavingRole(false);
    }
  }

  async function savePermissions() {
    setSavingPermissions(true);
    setPermissionMessage(null);
    const changes: PermissionChange[] = dirtyPermissions.map((p) => ({
      permissionId: p.id,
      effect: effects[p.id],
    }));
    try {
      await apiFetch(`/api/users/${id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ changes }),
      });
      setPermissionMessage({ tone: "success", text: "Đã lưu quyền của người dùng." });
      await load();
    } catch (err) {
      setPermissionMessage({ tone: "error", text: messageFor(err, "Không lưu được quyền.") });
    } finally {
      setSavingPermissions(false);
    }
  }

  if (forbidden) {
    return <Forbidden message="Bạn cần quyền 'Xem người dùng' để xem trang này." />;
  }

  if (sessionLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error || !user) {
    return <Alert>{error ?? "Không tìm thấy người dùng."}</Alert>;
  }

  return (
    <div>
      <PageHeader
        title={user.fullName}
        description="Chi tiết tài khoản, vai trò và quyền."
        actions={
          <Button variant="secondary" onClick={() => router.push("/users")}>
            Quay lại danh sách
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Thông tin tài khoản
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["Email", user.email],
              ["Số điện thoại", user.phoneNumber || "—"],
              ["Địa chỉ", user.address || "—"],
              ["Giới tính", user.gender === 1 ? "Nữ" : "Nam"],
              ["Ngày sinh", formatDate(user.dob)],
              ["Ngày tạo", user.createdAt ? new Date(user.createdAt).toLocaleString("vi-VN") : "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-right text-slate-800">{value}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Vai trò</dt>
              <dd>
                <Badge color={user.roleName === "Admin" ? "brand" : "slate"}>{user.roleName}</Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Trạng thái</dt>
              <dd>
                <Badge color={user.isActive ? "emerald" : "red"}>
                  {user.isActive ? "Đang hoạt động" : "Bị khóa"}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Đổi vai trò
          </h2>

          {!canUpdate ? (
            <div className="mt-4">
              <Alert tone="info">
                Bạn không có quyền <code>user.update</code> nên không thể đổi vai trò.
              </Alert>
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-3">
                <Field label="Vai trò mới">
                  <Select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    disabled={savingRole || roles.length === 0 || isSelf || isLastAdmin}
                  >
                    {roles.length === 0 ? <option value="">— Không tải được vai trò —</option> : null}
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                        {role.isSystem ? " (hệ thống)" : ""}
                      </option>
                    ))}
                  </Select>
                </Field>

                {isSelf ? (
                  <p className="text-xs text-amber-700">
                    Bạn không thể đổi vai trò của chính mình.
                  </p>
                ) : null}
                {isLastAdmin ? (
                  <p className="text-xs text-amber-700">
                    Đây là quản trị viên cuối cùng — không thể hạ vai trò.
                  </p>
                ) : null}
                {!canReadRoles && roles.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Cần quyền <code>role.read</code> để hiển thị danh sách vai trò.
                  </p>
                ) : null}

                <div>
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={
                      savingRole || roles.length === 0 || isSelf || isLastAdmin || selectedRoleId === user.roleId
                    }
                  >
                    Đổi vai trò
                  </Button>
                </div>
              </div>

              {roleMessage ? (
                <div className="mt-4">
                  <Alert tone={roleMessage.tone}>{roleMessage.text}</Alert>
                </div>
              ) : null}
            </>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Quyền của người dùng
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {overrideCount > 0
                  ? `${overrideCount} quyền đang được override riêng (bị xóa khi đổi vai trò).`
                  : "Chưa có override riêng — quyền theo vai trò."}
              </p>
            </div>
            {canUpdate ? (
              <Button
                onClick={savePermissions}
                loading={savingPermissions}
                disabled={dirtyPermissions.length === 0}
              >
                Lưu thay đổi ({dirtyPermissions.length})
              </Button>
            ) : null}
          </div>

          {permissionMessage ? (
            <div className="mt-4">
              <Alert tone={permissionMessage.tone}>{permissionMessage.text}</Alert>
            </div>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Quyền</th>
                  <th className="px-4 py-3">Mã</th>
                  <th className="px-4 py-3">Có hiệu lực</th>
                  <th className="px-4 py-3">Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userPermissions.map((permission) => (
                  <tr key={permission.id}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {permission.displayName || displayNameOf(permission.name)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {permission.name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={permission.hasPermission ? "emerald" : "red"}>
                        {permission.hasPermission ? "Cho phép" : "Bị chặn"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        className="w-36"
                        value={effects[permission.id] ?? permission.setting}
                        onChange={(e) =>
                          setEffects((prev) => ({
                            ...prev,
                            [permission.id]: e.target.value as PermissionSetting,
                          }))
                        }
                        disabled={!canUpdate}
                      >
                        <option value="Inherit">Inherit (theo vai trò)</option>
                        <option value="Allow">Allow (cho phép)</option>
                        <option value="Deny">Deny (chặn)</option>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            {myPermissions.length > 0
              ? "Hiển thị theo quyền của bạn — thay đổi chỉ có hiệu lực khi bạn có quyền user.update."
              : null}
          </p>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Xác nhận đổi vai trò"
        danger
        loading={savingRole}
        confirmLabel="Đổi vai trò"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmChangeRole}
        message={
          <div className="space-y-2">
            <p>
              Đổi vai trò của <strong>{user.fullName}</strong> từ{" "}
              <strong>{user.roleName}</strong> sang{" "}
              <strong>{roles.find((r) => r.id === selectedRoleId)?.name ?? "vai trò mới"}</strong>?
            </p>
            <p className="text-red-600">
              Thao tác này sẽ xóa toàn bộ override quyền hiện có
              {overrideCount > 0 ? ` (${overrideCount} mục)` : ""} của người dùng.
            </p>
          </div>
        }
      />
    </div>
  );
}
