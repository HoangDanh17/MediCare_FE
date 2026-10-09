"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError, messageFor } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import { Forbidden } from "@/components/forbidden";
import { Alert, Card, EmptyState, PageHeader, Spinner } from "@/components/ui";
import { PERMISSION_LABELS, type PermissionCode, type PermissionOption } from "@/lib/types";

export default function PermissionsPage() {
  const { can, displayNameOf, permissions } = useSession();
  const [list, setList] = useState<PermissionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const allowed = can("permission.read");

  const load = useCallback(() => {
    return apiFetch<PermissionOption[]>("/api/permissions")
      .then((data) => {
        setList([...data].sort((a, b) => a.name.localeCompare(b.name)));
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(messageFor(err, "Không tải được danh sách quyền."));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  if (!allowed) {
    return <Forbidden message="Bạn cần quyền 'Xem danh sách quyền' để dùng chức năng này." />;
  }
  if (forbidden) return <Forbidden />;

  return (
    <div>
      <PageHeader
        title="Danh sách quyền"
        description="Toàn bộ 9 quyền trong hệ thống. Label tiếng Việt lấy từ /api/auth/me/permissions."
      />

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <EmptyState message="Chưa có quyền nào." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã quyền</th>
                <th className="px-4 py-3">Tên hiển thị</th>
                <th className="px-4 py-3">Bạn có quyền này?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.map((permission) => {
                const mine = permissions.find((p) => p.name === permission.name);
                return (
                  <tr key={permission.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {permission.name}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {displayNameOf(permission.name) ||
                        PERMISSION_LABELS[permission.name as PermissionCode] ||
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      {mine ? (
                        <span
                          className={
                            mine.hasPermission
                              ? "font-medium text-emerald-600"
                              : "font-medium text-slate-400"
                          }
                        >
                          {mine.hasPermission ? "Có" : "Không"}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
