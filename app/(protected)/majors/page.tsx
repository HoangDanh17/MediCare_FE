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
import type { MajorResponse } from "@/lib/types";

export default function MajorsPage() {
  const { can } = useSession();
  const [majors, setMajors] = useState<MajorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [deleting, setDeleting] = useState<MajorResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const load = useCallback(() => {
    return apiFetch<MajorResponse[]>("/api/majors")
      .then((data) => {
        setMajors(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(messageFor(err, "Không tải được danh sách khoa."));
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
      await apiFetch(`/api/majors/${deleting.id}`, { method: "DELETE" });
      setMessage({ tone: "success", text: `Đã xóa khoa "${deleting.name}".` });
      setDeleting(null);
      await load();
    } catch (err) {
      setMessage({ tone: "error", text: messageFor(err, "Không xóa được khoa.") });
      setDeleting(null);
      setLoading(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (forbidden) {
    return <Forbidden message="Bạn cần quyền 'Xem khoa' để dùng chức năng này." />;
  }

  const canUpdate = can("major.update");
  const canDelete = can("major.delete");
  const canCreate = can("major.create");

  return (
    <div>
      <PageHeader
        title="Khoa"
        description="Danh mục khoa/chuyên khoa dùng cho đặt lịch khám."
        actions={
          canCreate ? (
            <Link href="/majors/new">
              <Button>Tạo khoa</Button>
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
      ) : majors.length === 0 ? (
        <EmptyState message="Chưa có khoa nào." />
      ) : (
        <div className="grid gap-4">
          {majors.map((major) => (
            <Card key={major.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{major.name}</h2>
                    <Badge color="brand">Khoa</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {major.description?.trim() || "Chưa có mô tả."}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {canUpdate ? (
                    <Link href={`/majors/${major.id}`}>
                      <Button variant="secondary">Sửa</Button>
                    </Link>
                  ) : null}
                  {canDelete ? (
                    <Button variant="danger" onClick={() => setDeleting(major)}>
                      Xóa
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Xác nhận xóa khoa"
        danger
        loading={deleteLoading}
        confirmLabel="Xóa"
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        message={
          <p>
            Xóa khoa <strong>{deleting?.name}</strong>? Thao tác này không thể hoàn tác.
          </p>
        }
      />
    </div>
  );
}
