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
  Input,
  PageHeader,
  Select,
  Spinner,
} from "@/components/ui";
import { ROOM_TYPES, type RoomResponse, type RoomType } from "@/lib/types";

export default function RoomDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { can } = useSession();

  const [room, setRoom] = useState<RoomResponse | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canRead = can("room.read");
  const canUpdate = can("room.update");
  const canDelete = can("room.delete");

  const load = useCallback(() => {
    return apiFetch<RoomResponse>(`/api/rooms/${id}`)
      .then((data) => {
        setRoom(data);
        setName(data.name);
        setType(data.type);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) setError("__forbidden__");
        else setError(messageFor(err, "Không tải được phòng."));
        setRoom(null);
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
    if (!room) return;
    setFieldErrors({});
    setMessage(null);

    if (!name.trim()) {
      setFieldErrors({ name: "Tên phòng là bắt buộc." });
      return;
    }
    if (name.trim().length > 100) {
      setFieldErrors({ name: "Tên phòng tối đa 100 ký tự." });
      return;
    }

    setSaving(true);
    try {
      const updated = await apiFetch<RoomResponse>(`/api/rooms/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), type }),
      });
      setRoom(updated);
      setType(updated.type);
      setMessage({ tone: "success", text: "Đã lưu phòng." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setFieldErrors(err.fieldErrors);
        setMessage({ tone: "error", text: err.generalErrors[0] ?? err.message });
      } else {
        setMessage({ tone: "error", text: messageFor(err, "Không lưu được phòng.") });
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!room) return;
    setToggling(true);
    setMessage(null);
    try {
      const updated = await apiFetch<RoomResponse>(`/api/rooms/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !room.isActive }),
      });
      setRoom(updated);
      setMessage({
        tone: "success",
        text: `Đã ${updated.isActive ? "bật" : "ngừng"} hoạt động phòng.`,
      });
    } catch (err) {
      setMessage({ tone: "error", text: messageFor(err, "Không đổi được trạng thái phòng.") });
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setMessage(null);
    try {
      await apiFetch(`/api/rooms/${id}`, { method: "DELETE" });
      router.replace("/rooms");
    } catch (err) {
      setMessage({ tone: "error", text: messageFor(err, "Không xóa được phòng.") });
      setDeleteOpen(false);
      setDeleting(false);
    }
  }

  if (!canRead) {
    return <Forbidden message="Bạn cần quyền 'Xem phòng' để dùng chức năng này." />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error === "__forbidden__") {
    return <Forbidden message="Bạn không có quyền xem phòng này." />;
  }

  if (error || !room) {
    return <Alert>{error ?? "Không tìm thấy phòng."}</Alert>;
  }

  const readOnly = !canUpdate;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={room.name}
        description="Chi tiết và trạng thái hoạt động của phòng."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/rooms")}>
              Quay lại
            </Button>
            {canDelete ? (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                Xóa phòng
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

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge color={room.isActive ? "emerald" : "red"}>
              {room.isActive ? "Hoạt động" : "Ngừng hoạt động"}
            </Badge>
          </div>
          {canUpdate ? (
            <Button variant="secondary" loading={toggling} onClick={toggleStatus}>
              {room.isActive ? "Ngừng hoạt động" : "Bật hoạt động"}
            </Button>
          ) : null}
        </div>
      </Card>

      <form onSubmit={handleSave} className="flex flex-col gap-6" noValidate>
        <Card>
          <div className="flex flex-col gap-4">
            <Field label="Tên phòng" required error={fieldErrors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly || saving}
              />
            </Field>
            <Field label="Loại phòng" required error={fieldErrors.type}>
              <Select
                value={type}
                onChange={(e) => setType(Number(e.target.value) as RoomType)}
                disabled={readOnly || saving}
              >
                {ROOM_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        {!readOnly ? (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setName(room.name);
                setType(room.type);
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
        title="Xác nhận xóa phòng"
        danger
        loading={deleting}
        confirmLabel="Xóa"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        message={
          <p>
            Xóa phòng <strong>{room.name}</strong>? Thao tác này không thể hoàn tác.
          </p>
        }
      />
    </div>
  );
}
