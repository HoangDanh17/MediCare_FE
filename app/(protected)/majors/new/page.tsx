"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import { Forbidden } from "@/components/forbidden";
import { Alert, Button, Card, Field, Input, PageHeader, Textarea } from "@/components/ui";
import type { MajorResponse } from "@/lib/types";

export default function NewMajorPage() {
  const router = useRouter();
  const { can } = useSession();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  if (!can("major.create")) {
    return <Forbidden message="Bạn cần quyền 'Tạo khoa' để dùng chức năng này." />;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Tên khoa là bắt buộc.";
    else if (name.trim().length > 100) nextErrors.name = "Tên khoa tối đa 100 ký tự.";
    if (description.trim().length > 500)
      nextErrors.description = "Mô tả tối đa 500 ký tự.";
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await apiFetch<MajorResponse>("/api/majors", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
        }),
      });
      router.replace("/majors");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400) {
          setFieldErrors(error.fieldErrors);
          setFormError(error.generalErrors[0] ?? null);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Không tạo được khoa. Vui lòng thử lại.");
      }
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Tạo khoa" description="Thêm một khoa/chuyên khoa mới vào hệ thống." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        {formError ? <Alert>{formError}</Alert> : null}

        <Card>
          <div className="flex flex-col gap-4">
            <Field label="Tên khoa" required error={fieldErrors.name}>
              <Input
                value={name}
                placeholder="VD: Khoa Tim mạch"
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </Field>
            <Field label="Mô tả" error={fieldErrors.description}>
              <Textarea
                rows={3}
                value={description}
                placeholder="Mô tả ngắn về khoa (không bắt buộc)"
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
              />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            Tạo khoa
          </Button>
        </div>
      </form>
    </div>
  );
}
