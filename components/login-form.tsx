"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login } from "@/lib/client-auth";
import { ApiError } from "@/lib/errors";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export function LoginForm({
  next,
  registered,
  email: registeredEmail,
}: {
  next?: string;
  registered?: boolean;
  email?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(registeredEmail ?? "");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const nextPath = next && next.startsWith("/") ? next : "/dashboard";
    if (!email.trim() || !password) {
      setFieldErrors({
        ...(email.trim() ? {} : { email: "Email là bắt buộc." }),
        ...(password ? {} : { password: "Mật khẩu là bắt buộc." }),
      });
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400) {
          setFieldErrors(error.fieldErrors);
          setFormError(error.generalErrors[0] ?? error.message);
        } else {
          setFormError(error.message);
        }
      } else {
        setFormError("Không kết nối được máy chủ. Vui lòng thử lại.");
      }
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 h-80 w-80 rounded-full bg-brand-100/70 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Link href="/" className="flex flex-col items-center gap-2">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/20">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden>
                <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" />
              </svg>
            </span>
            <h1 className="text-2xl font-semibold text-slate-900">MediCare</h1>
          </Link>
          <p className="text-sm text-slate-500">Đăng nhập để tiếp tục</p>
        </div>

        <Card className="shadow-md shadow-slate-900/5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {registered ? (
              <Alert tone="success">Tạo tài khoản thành công. Giờ đăng nhập nhé.</Alert>
            ) : null}
            {formError ? <Alert>{formError}</Alert> : null}

            <Field label="Email" required error={fieldErrors.email}>
              <Input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="ban@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </Field>

            <Field label="Mật khẩu" required error={fieldErrors.password}>
              <Input
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </Field>

            <Button type="submit" loading={loading} className="w-full">
              Đăng nhập
            </Button>
          </form>
        </Card>

        <p className="mt-5 text-center text-sm text-slate-500">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
          >
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
