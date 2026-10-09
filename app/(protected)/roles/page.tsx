"use client";

import Link from "next/link";
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
  EmptyState,
  PageHeader,
  Spinner,
} from "@/components/ui";
import type { RoleResponse } from "@/lib/types";

export default function RolesPage() {
  const { can, displayNameOf } = useSession();
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [deleting, setDeleting] = useState<RoleResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const load = useCallback(() => {
    return apiFetch<RoleResponse[]>("/api/roles")
      .then((data) => {
        setRoles(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(messageFor(err, "Không tải được danh sách vai trò."));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/api/roles/${deleting.id}`, { method: "DELETE" });
      setMessage({ tone: "success", text: `Đã xóa vai trò "${deleting.name}".` });
      setDeleting(null);
      await load();
    } catch (err) {
      setMessage({ tone: "error", text: messageFor(err, "Không xóa được vai trò.") });
      setDeleting(null);
      setLoading(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (forbidden) {
    return <Forbidden message="Bạn cần quyền 'Xem vai trò' để dùng chức năng này." />;
  }

  const canDelete = can("role.delete");
  const canCreate = can("role.create");

  return (
    <div>
      <PageHeader
        title="Vai trò"
        description="Vai trò Admin và User là vai trò hệ thống — không thể sửa hoặc xóa."
        actions={
          canCreate ? (
            <Link href="/roles/new">
              <Button>Tạo vai trò</Button>
            </Link>
          ) : null
        }
      />

      {message ? (
        <div className="mb-4">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      ) : null}
      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : roles.length === 0 ? (
        <EmptyState message="Chưa có vai trò nào." />
      ) : (
        <div className="grid gap-4">
          {roles.map((role) => {
            const editable = can("role.update") && !role.isSystem;
            const deletable = canDelete && !role.isSystem;
            return (
              <Card key={role.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{role.name}</h2>
                      {role.isSystem ? <Badge color="brand">Hệ thống</Badge> : null}
                      <Badge>{role.permissions.length} quyền</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {role.permissions.length === 0 ? (
                        <span className="text-sm text-slate-400">Không có quyền nào.</span>
                      ) : (
                        role.permissions.map((permission) => (
                          <span
                            key={permission.id}
                            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                            title={permission.name}
                          >
                            {displayNameOf(permission.name) || permission.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {editable ? (
                      <Link href={`/roles/${role.id}`}>
                        <Button variant="secondary">Sửa</Button>
                      </Link>
                    ) : null}
                    {can("role.delete") && role.isSystem ? (
                      <Button variant="secondary" disabled title="Vai trò hệ thống">
                        Xóa
                      </Button>
                    ) : null}
                    {deletable ? (
                      <Button variant="danger" onClick={() => setDeleting(role)}>
                        Xóa
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Xác nhận xóa vai trò"
        danger
        loading={deleteLoading}
        confirmLabel="Xóa"
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        message={
          <p>
            Xóa vai trò <strong>{deleting?.name}</strong>? Người dùng đang gắn vai trò này sẽ không
            xóa được (backend trả lỗi RoleInUse).
          </p>
        }
      />
    </div>
  );
}
