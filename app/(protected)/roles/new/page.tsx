"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import { Forbidden } from "@/components/forbidden";
import { PermissionPicker } from "@/components/permission-picker";
import { Alert, Button, Card, Field, Input, PageHeader } from "@/components/ui";
import type { RoleResponse } from "@/lib/types";

export default function NewRolePage() {
  const router = useRouter();
  const { can } = useSession();
  const [name, setName] = useState("");
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (!can("role.create")) {
    return <Forbidden message="Bạn cần quyền 'Tạo vai trò' để dùng chức năng này." />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

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
      await apiFetch<RoleResponse>("/api/roles", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), permissionIds }),
      });
      router.replace("/roles");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400) {
          setFieldErrors(error.fieldErrors);
          setFormError(error.generalErrors[0] ?? null);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Không tạo được vai trò. Vui lòng thử lại.");
      }
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Tạo vai trò" description="Chọn tên và nhóm quyền cho vai trò mới." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        {formError ? <Alert>{formError}</Alert> : null}

        <Card>
          <Field label="Tên vai trò" required error={fieldErrors.name}>
            <Input
              value={name}
              placeholder="VD: Quản lý lễ tân"
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </Field>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Quyền của vai trò ({permissionIds.length})
          </h2>
          <div className="mt-4">
            <PermissionPicker
              selectedIds={permissionIds}
              onChange={setPermissionIds}
              disabled={saving}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            Tạo vai trò
          </Button>
        </div>
      </form>
    </div>
  );
}
