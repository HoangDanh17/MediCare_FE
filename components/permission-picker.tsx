"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import { Alert, Spinner } from "@/components/ui";
import { PERMISSION_LABELS, type PermissionCode, type PermissionOption } from "@/lib/types";

export function PermissionPicker({
  selectedIds,
  onChange,
  disabled,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const { can, displayNameOf } = useSession();
  const [all, setAll] = useState<PermissionOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allowed = can("permission.read");
  const loading = allowed && all === null && error === null;

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    const run = async () => {
      try {
        const list = await apiFetch<PermissionOption[]>("/api/permissions");
        if (!cancelled) setAll([...list].sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setError("Quyền của bạn vừa bị thay đổi — vui lòng tải lại trang.");
        } else {
          setError("Không tải được danh sách quyền.");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  if (!allowed) {
    return (
      <Alert tone="info">
        Cần quyền <code>permission.read</code> để chọn quyền cho vai trò.
      </Alert>
    );
  }

  if (loading) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;
  if (!all || all.length === 0) return <Alert>Danh sách quyền trống.</Alert>;

  const items = all;

  const toggle = (id: string, checked: boolean) => {
    if (disabled) return;
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((item) => item !== id));
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((permission) => (
        <label
          key={permission.id}
          className={`flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 ${
            disabled ? "bg-slate-50 opacity-60" : "cursor-pointer hover:bg-slate-50"
          }`}
        >
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            checked={selectedIds.includes(permission.id)}
            disabled={disabled}
            onChange={(e) => toggle(permission.id, e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-slate-800">
              {displayNameOf(permission.name) ||
                PERMISSION_LABELS[permission.name as PermissionCode] ||
                permission.name}
            </span>
            <span className="block font-mono text-xs text-slate-500">{permission.name}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
