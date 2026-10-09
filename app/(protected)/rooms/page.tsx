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
import { roomTypeLabel, type RoomResponse } from "@/lib/types";

export default function RoomsPage() {
  const { can } = useSession();
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [deleting, setDeleting] = useState<RoomResponse | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const load = useCallback(() => {
    return apiFetch<RoomResponse[]>("/api/rooms")
      .then((data) => {
        setRooms(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) setForbidden(true);
        else setError(messageFor(err, "Không tải được danh sách phòng."));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus(room: RoomResponse) {
    setTogglingId(room.id);
    setMessage(null);
    try {
      const updated = await apiFetch<RoomResponse>(`/api/rooms/${room.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !room.isActive }),
      });
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setMessage({
        tone: "success",
        text: `Đã ${updated.isActive ? "bật" : "ngừng"} hoạt động phòng "${updated.name}".`,
      });
    } catch (err) {
      setMessage({ tone: "error", text: messageFor(err, "Không đổi được trạng thái phòng.") });
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    setLoading(true);
    setMessage(null);
    try {
      await apiFetch(`/api/rooms/${deleting.id}`, { method: "DELETE" });
      setMessage({ tone: "success", text: `Đã xóa phòng "${deleting.name}".` });
      setDeleting(null);
      await load();
    } catch (err) {
      setMessage({ tone: "error", text: messageFor(err, "Không xóa được phòng.") });
      setDeleting(null);
      setLoading(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (forbidden) {
    return <Forbidden message="Bạn cần quyền 'Xem phòng' để dùng chức năng này." />;
  }

  const canUpdate = can("room.update");
  const canDelete = can("room.delete");
  const canCreate = can("room.create");

  return (
    <div>
      <PageHeader
        title="Phòng"
        description="Danh mục phòng khám, thủ thuật, xét nghiệm... dùng cho đặt lịch khám."
        actions={
          canCreate ? (
            <Link href="/rooms/new">
              <Button>Tạo phòng</Button>
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
      ) : rooms.length === 0 ? (
        <EmptyState message="Chưa có phòng nào." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Tên phòng</th>
                <th className="px-4 py-3">Loại phòng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{room.name}</td>
                  <td className="px-4 py-3 text-slate-600">{roomTypeLabel(room.type)}</td>
                  <td className="px-4 py-3">
                    <Badge color={room.isActive ? "emerald" : "red"}>
                      {room.isActive ? "Hoạt động" : "Ngừng"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canUpdate ? (
                        <Button
                          variant="secondary"
                          loading={togglingId === room.id}
                          onClick={() => toggleStatus(room)}
                        >
                          {room.isActive ? "Ngừng" : "Bật"}
                        </Button>
                      ) : null}
                      {canUpdate ? (
                        <Link href={`/rooms/${room.id}`}>
                          <Button variant="secondary">Sửa</Button>
                        </Link>
                      ) : null}
                      {canDelete ? (
                        <Button variant="danger" onClick={() => setDeleting(room)}>
                          Xóa
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Xác nhận xóa phòng"
        danger
        loading={deleteLoading}
        confirmLabel="Xóa"
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
        message={
          <p>
            Xóa phòng <strong>{deleting?.name}</strong>? Thao tác này không thể hoàn tác.
          </p>
        }
      />
    </div>
  );
}
