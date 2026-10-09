"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import { Forbidden } from "@/components/forbidden";
import { Alert, Button, Card, Field, Input, PageHeader, Select } from "@/components/ui";
import type { CreateUserRequest, UserResponse } from "@/lib/types";

interface FormState {
  fullName: string;
  email: string;
  password: string;
  phoneNumber: string;
  address: string;
  gender: 0 | 1;
  dob: string;
}

const INITIAL: FormState = {
  fullName: "",
  email: "",
  password: "",
  phoneNumber: "",
  address: "",
  gender: 0,
  dob: "",
};

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.fullName.trim()) errors.fullName = "Họ tên là bắt buộc.";
  else if (form.fullName.length > 200) errors.fullName = "Họ tên tối đa 200 ký tự.";

  if (!form.email.trim()) errors.email = "Email là bắt buộc.";
  else if (form.email.length > 256 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Email không hợp lệ.";

  if (!form.password) errors.password = "Mật khẩu là bắt buộc.";
  else if (form.password.length < 6 || form.password.length > 128)
    errors.password = "Mật khẩu phải từ 6 đến 128 ký tự.";

  if (!form.phoneNumber.trim()) errors.phoneNumber = "Số điện thoại là bắt buộc.";
  else if (!/^\+?\d{10,12}$/.test(form.phoneNumber.trim()))
    errors.phoneNumber = "Số điện thoại phải có 10–12 chữ số (có thể bắt đầu bằng +).";

  if (!form.address.trim()) errors.address = "Địa chỉ là bắt buộc.";
  else if (form.address.length > 500) errors.address = "Địa chỉ tối đa 500 ký tự.";

  if (!form.dob) errors.dob = "Ngày sinh là bắt buộc.";
  else {
    const today = new Date().toISOString().substring(0, 10);
    if (form.dob > today) errors.dob = "Ngày sinh không được là ngày tương lai.";
  }

  return errors;
}

export default function NewUserPage() {
  const router = useRouter();
  const { can } = useSession();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!can("user.create")) {
    return <Forbidden message="Bạn cần quyền 'Tạo người dùng' để dùng chức năng này." />;
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const clientErrors = validate(form);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setSaving(true);
    try {
      const payload: CreateUserRequest = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim(),
        gender: form.gender,
        dob: form.dob,
      };
      const created = await apiFetch<UserResponse>("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.replace(`/users/${created.id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400 && Object.keys(error.fieldErrors).length > 0) {
          setFieldErrors(error.fieldErrors);
          setFormError(error.generalErrors[0] ?? null);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Không tạo được người dùng. Vui lòng thử lại.");
      }
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Tạo người dùng"
        description="Người dùng mới mặc định được gán vai trò User."
      />

      <Card>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {formError ? (
            <div className="sm:col-span-2">
              <Alert>{formError}</Alert>
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <Field label="Họ tên" required error={fieldErrors.fullName}>
              <Input
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                disabled={saving}
              />
            </Field>
          </div>

          <Field label="Email" required error={fieldErrors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              disabled={saving}
            />
          </Field>

          <Field label="Mật khẩu" required error={fieldErrors.password}>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              disabled={saving}
            />
          </Field>

          <Field label="Số điện thoại" required error={fieldErrors.phoneNumber}>
            <Input
              value={form.phoneNumber}
              placeholder="0912345678"
              onChange={(e) => update("phoneNumber", e.target.value)}
              disabled={saving}
            />
          </Field>

          <Field label="Ngày sinh" required error={fieldErrors.dob}>
            <Input
              type="date"
              value={form.dob}
              onChange={(e) => update("dob", e.target.value)}
              disabled={saving}
            />
          </Field>

          <Field label="Giới tính" required error={fieldErrors.gender}>
            <Select
              value={form.gender}
              onChange={(e) => update("gender", Number(e.target.value) as 0 | 1)}
              disabled={saving}
            >
              <option value={0}>Nam</option>
              <option value={1}>Nữ</option>
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Địa chỉ" required error={fieldErrors.address}>
              <Input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                disabled={saving}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="secondary" onClick={() => router.back()} disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" loading={saving}>
              Tạo người dùng
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
