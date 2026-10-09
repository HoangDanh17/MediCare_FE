"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError, messageFor } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import { Forbidden } from "@/components/forbidden";
import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Input,
  PageHeader,
  Spinner,
  Textarea,
} from "@/components/ui";
import type { MajorResponse } from "@/lib/types";

export default function MajorDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const { can } = useSession();

  const [major, setMajor] = useState<MajorResponse | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canRead = can("major.read");
  const canUpdate = can("major.update");
  const canDelete = can("major.delete");

  const load = useCallback(() => {
    return apiFetch<MajorResponse>(`/api/majors/${id}`)
      .then((data) => {
        setMajor(data);
        setName(data.name);
        setDescription(data.description ?? "");
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) setError("__forbidden__");
        else setError(messageFor(err, "Không tải được khoa."));
        setMajor(null);
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
    if (!major) return;
    setFieldErrors({});
    setMessage(null);

    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Tên khoa là bắt buộc.";
    else if (name.trim().length > 100) nextErrors.name = "Tên khoa tối đa 100 ký tự.";
    if (description.trim().length > 500) nextErrors.description = "Mô tả tối đa 500 ký tự.";
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      const updated = await apiFetch<MajorResponse>(`/api/majors/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
        }),
      });
      setMajor(updated);
      setMessage({ tone: "success", text: "Đã lưu khoa." });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setFieldErrors(err.fieldErrors);
        setMessage({ tone: "error", text: err.generalErrors[0] ?? err.message });
      } else {
        setMessage({ tone: "error", text: messageFor(err, "Không lưu được khoa.") });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setMessage(null);
    try {
      await apiFetch(`/api/majors/${id}`, { method: "DELETE" });
      router.replace("/majors");
    } catch (err) {
      setMessage({ tone: "error", text: messageFor(err, "Không xóa được khoa.") });
      setDeleteOpen(false);
      setDeleting(false);
    }
  }

  if (!canRead) {
    return <Forbidden message="Bạn cần quyền 'Xem khoa' để dùng chức năng này." />;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error === "__forbidden__") {
    return <Forbidden message="Bạn không có quyền xem khoa này." />;
  }

  if (error || !major) {
    return <Alert>{error ?? "Không tìm thấy khoa."}</Alert>;
  }

  const readOnly = !canUpdate;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={major.name}
        description="Chi tiết khoa và mô tả."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/majors")}>
              Quay lại
            </Button>
            {canDelete ? (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                Xóa khoa
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

      <form onSubmit={handleSave} className="flex flex-col gap-6" noValidate>
        <Card>
          <div className="flex flex-col gap-4">
            <Field label="Tên khoa" required error={fieldErrors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={readOnly || saving}
              />
            </Field>
            <Field label="Mô tả" error={fieldErrors.description}>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={readOnly || saving}
              />
            </Field>
          </div>
        </Card>

        {!readOnly ? (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setName(major.name);
                setDescription(major.description ?? "");
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
        title="Xác nhận xóa khoa"
        danger
        loading={deleting}
        confirmLabel="Xóa"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        message={
          <p>
            Xóa khoa <strong>{major.name}</strong>? Thao tác này không thể hoàn tác.
          </p>
        }
      />
    </div>
  );
}
