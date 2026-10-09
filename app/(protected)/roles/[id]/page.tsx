"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError, messageFor } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import { Forbidden } from "@/components/forbidden";
import { PermissionPicker } from "@/components/permission-picker";
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Input,
  PageHeader,
  Spinner,
} from "@/components/ui";
import type { RoleResponse } from "@/lib/types";

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { can } = useSession();

  const [role, setRole] = useState<RoleResponse | null>(null);
  const [name, setName] = useState("");
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canRead = can("role.read");
  const canUpdate = can("role.update");
  const canDelete = can("role.delete");

  const load = useCallback(() => {
    return apiFetch<RoleResponse>(`/api/roles/${id}`)
      .then((data) => {
        setRole(data);
        setName(data.name);
        setPermissionIds(data.permissions.map((p) => p.id));
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) setError("__forbidden__");
        else setError(messageFor(err, "Không tải được vai trò."));
        setRole(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (canRead) void load();
  }, [canRead, load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!role) return;
    setFieldErrors({});
    setMessage(null);

    if (!name.trim()) {
      setFieldErrors({ name: "Tên vai trò là bắt buộc." });
      return;
    }
    if (name.length > 100) {
      setFieldErrors({ name: "Tên vai trò tối đa 100 ký tự." });
      return;
    }

    setSaving(true);
    try {
      const updated = await apiFetch<RoleResponse>(`/api/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), permissionIds }),
      });
      setRole(updated);
      setMessage({ tone: "success", text: "Đã lưu vai trò." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setFieldErrors(err.fieldErrors);
        setMessage({ tone: "error", text: err.generalErrors[0] ?? err.message });
      } else {
        setMessage({ tone: "error", text: messageFor(err, "Không lưu được vai trò.") });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setMessage(null);
    try {
      await apiFetch(`/api/roles/${id}`, { method: "DELETE" });
      router.replace("/roles");
    } catch (err) {
      setMessage({ tone: "error", text: messageFor(err, "Không xóa được vai trò.") });
      setDeleteOpen(false);
      setDeleting(false);
    }
  }

  if (!canRead) {
    return <Forbidden message="Bạn cần quyền 'Xem vai trò' để dùng chức năng này." />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error === "__forbidden__") {
    return <Forbidden message="Bạn không có quyền xem vai trò này." />;
  }

  if (error || !role) {
    return <Alert>{error ?? "Không tìm thấy vai trò."}</Alert>;
  }

  const readOnly = role.isSystem || !canUpdate;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={role.name}
        description="Chi tiết vai trò và nhóm quyền."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/roles")}>
              Quay lại
            </Button>
            {canDelete && !role.isSystem ? (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                Xóa vai trò
              </Button>
            ) : null}
          </div>
        }
      />

      {message ? (
        <div className="mb-4">
          <Alert tone={message.tone}>{message.text}</Alert>
        </div>
      ) : null}

      {role.isSystem ? (
        <div className="mb-4">
          <Alert tone="info">
            Đây là vai trò hệ thống — backend trả lỗi <code>Role.SystemRole</code> nếu cố sửa hoặc
            xóa.
          </Alert>
        </div>
      ) : null}

      <form onSubmit={handleSave} className="flex flex-col gap-6" noValidate>
        <Card>
          <Field label="Tên vai trò" required error={fieldErrors.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={readOnly || saving}
            />
          </Field>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Badge color={role.isSystem ? "brand" : "slate"}>
              {role.isSystem ? "Hệ thống" : "Tùy chỉnh"}
            </Badge>
            <span>{role.permissions.length} quyền</span>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Quyền của vai trò ({permissionIds.length})
          </h2>
          <div className="mt-4">
            <PermissionPicker
              selectedIds={permissionIds}
              onChange={setPermissionIds}
              disabled={readOnly || saving}
            />
          </div>
        </Card>

        {!readOnly ? (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setName(role.name);
                setPermissionIds(role.permissions.map((p) => p.id));
                setFieldErrors({});
                setMessage(null);
              }}
              disabled={saving}
            >
              Đặt lại
            </Button>
            <Button type="submit" loading={saving}>
              Lưu thay đổi
            </Button>
          </div>
        ) : null}
      </form>

      <ConfirmDialog
        open={deleteOpen}
        title="Xác nhận xóa vai trò"
        danger
        loading={deleting}
        confirmLabel="Xóa"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        message={
          <p>
            Xóa vai trò <strong>{role.name}</strong>? Vai trò đang có người dùng gắn sẽ không xóa
            được (backend trả lỗi <code>RoleInUse</code>).
          </p>
        }
      />
    </div>
  );
}
