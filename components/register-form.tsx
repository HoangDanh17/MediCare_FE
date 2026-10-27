"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { login } from "@/lib/client-auth";
import { ApiError } from "@/lib/errors";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import type { CreateUserRequest, UserResponse } from "@/lib/types";

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  address: string;
  gender: 0 | 1;
  dob: string;
}

const INITIAL: FormState = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
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

  if (!form.confirmPassword) errors.confirmPassword = "Nhập lại mật khẩu là bắt buộc.";
  else if (form.confirmPassword !== form.password)
    errors.confirmPassword = "Mật khẩu nhập lại không khớp.";

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

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const clientErrors = validate(form);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    const email = form.email.trim();
    setSaving(true);
    try {
      const payload: CreateUserRequest = {
        fullName: form.fullName.trim(),
        email,
        password: form.password,
        phoneNumber: form.phoneNumber.trim(),
        address: form.address.trim(),
        gender: form.gender,
        dob: form.dob,
      };
      await apiFetch<UserResponse>("/api/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setFieldErrors({ email: error.message });
        } else if (error.status === 400 && Object.keys(error.fieldErrors).length > 0) {
          setFieldErrors(error.fieldErrors);
          setFormError(error.generalErrors[0] ?? null);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Không tạo được tài khoản. Vui lòng thử lại.");
      }
      setSaving(false);
      return;
    }

    // Tạo xong → đăng nhập luôn
    try {
      await login(email, form.password);
      router.replace("/dashboard");
      router.refresh();
    } catch {
      router.replace(`/login?registered=1&email=${encodeURIComponent(email)}`);
      router.refresh();
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-brand-100/70 blur-3xl"
      />

      <div className="relative w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Link href="/" className="flex flex-col items-center gap-2">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/20">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
                <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />
              </svg>
            </span>
            <h1 className="text-2xl font-semibold text-slate-900">Tạo tài khoản</h1>
          </Link>
          <p className="text-sm text-slate-500">
            Đăng ký miễn phí để sử dụng hệ thống MediCare
          </p>
        </div>

        <Card className="shadow-md shadow-slate-900/5">
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
                  autoComplete="name"
                  placeholder="Nguyễn Văn A"
                  onChange={(e) => update("fullName", e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Email" required error={fieldErrors.email}>
                <Input
                  type="email"
                  value={form.email}
                  autoComplete="email"
                  placeholder="ban@example.com"
                  onChange={(e) => update("email", e.target.value)}
                  disabled={saving}
                />
              </Field>
            </div>

            <Field label="Mật khẩu" required error={fieldErrors.password}>
              <Input
                type="password"
                value={form.password}
                autoComplete="new-password"
                placeholder="Từ 6 ký tự"
                onChange={(e) => update("password", e.target.value)}
                disabled={saving}
              />
            </Field>

            <Field label="Nhập lại mật khẩu" required error={fieldErrors.confirmPassword}>
              <Input
                type="password"
                value={form.confirmPassword}
                autoComplete="new-password"
                placeholder="••••••"
                onChange={(e) => update("confirmPassword", e.target.value)}
                disabled={saving}
              />
            </Field>

            <Field label="Số điện thoại" required error={fieldErrors.phoneNumber}>
              <Input
                value={form.phoneNumber}
                autoComplete="tel"
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

            <Field label="Địa chỉ" required error={fieldErrors.address}>
              <Input
                value={form.address}
                placeholder="Số nhà, đường, quận/huyện..."
                onChange={(e) => update("address", e.target.value)}
                disabled={saving}
              />
            </Field>

            <div className="sm:col-span-2">
              <Button type="submit" loading={saving} className="w-full">
                Tạo tài khoản
              </Button>
            </div>
          </form>
        </Card>

        <p className="mt-5 text-center text-sm text-slate-500">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
