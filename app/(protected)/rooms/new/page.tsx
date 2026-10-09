"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import { Forbidden } from "@/components/forbidden";
import { Alert, Button, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { ROOM_TYPES, type RoomResponse, type RoomType } from "@/lib/types";

export default function NewRoomPage() {
  const router = useRouter();
  const { can } = useSession();
  const [name, setName] = useState("");
  const [type, setType] = useState<RoomType>(1);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (!can("room.create")) {
    return <Forbidden message="Bạn cần quyền 'Tạo phòng' để dùng chức năng này." />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

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
      await apiFetch<RoomResponse>("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), type }),
      });
      router.replace("/rooms");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400) {
          setFieldErrors(error.fieldErrors);
          setFormError(error.generalErrors[0] ?? null);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Không tạo được phòng. Vui lòng thử lại.");
      }
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Tạo phòng" description="Thêm một phòng mới vào hệ thống." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        {formError ? <Alert>{formError}</Alert> : null}

        <Card>
          <div className="flex flex-col gap-4">
            <Field label="Tên phòng" required error={fieldErrors.name}>
              <Input
                value={name}
                placeholder="VD: Phòng khám K101"
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field label="Loại phòng" required error={fieldErrors.type}>
              <Select
                value={type}
                onChange={(e) => setType(Number(e.target.value) as RoomType)}
                disabled={saving}
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

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            Tạo phòng
          </Button>
        </div>
      </form>
    </div>
  );
}
