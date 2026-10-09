"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/errors";
import { useSession } from "@/hooks/use-session";
import { Forbidden } from "@/components/forbidden";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Select, Spinner } from "@/components/ui";
import type { PagedUsers } from "@/lib/types";

function formatDate(value: string): string {
  if (!value) return "—";
  return value.substring(0, 10);
}

interface UsersResult {
  page: number;
  pageSize: number;
  search: string;
  data: PagedUsers | null;
  error: string | null;
  forbidden: boolean;
}

function UsersPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { can } = useSession();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "10") || 10));
  const search = searchParams.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(search);
  const [result, setResult] = useState<UsersResult | null>(null);

  const setParams = useCallback(
    (next: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, String(value));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await apiFetch<PagedUsers>(
          `/api/users?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
        );
        if (!cancelled) {
          setResult({ page, pageSize, search, data, error: null, forbidden: false });
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const forbidden = err instanceof ApiError && err.status === 403;
        setResult({
          page,
          pageSize,
          search,
          data: null,
          error: forbidden
            ? null
            : err instanceof ApiError
              ? err.message
              : "Không tải được danh sách người dùng.",
          forbidden,
        });
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search]);

  const current =
    result && result.page === page && result.pageSize === pageSize && result.search === search
      ? result
      : null;
  const loading = current === null;
  const data = current?.data ?? null;
  const error = current?.error ?? null;
  const forbidden = current?.forbidden ?? false;

  if (forbidden) return <Forbidden message="Bạn cần quyền 'Xem người dùng' để xem danh sách này." />;

  const totalPages = data?.totalPages ?? 1;

  return (
    <div>
      <PageHeader
        title="Người dùng"
        description="Danh sách tài khoản trong hệ thống (tìm kiếm theo họ tên hoặc email)."
        actions={
          can("user.create") ? (
            <Link href="/users/new">
              <Button>Tạo người dùng</Button>
            </Link>
          ) : null
        }
      />

      <Card className="mb-4">
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ search: searchInput.trim(), page: 1 });
          }}
        >
          <Input
            className="max-w-xs"
            placeholder="Tìm theo họ tên hoặc email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button type="submit" variant="secondary">
            Tìm
          </Button>
          {search ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchInput("");
                setParams({ search: null, page: 1 });
              }}
            >
              Xóa bộ lọc
            </Button>
          ) : null}
        </form>
      </Card>

      {error ? (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState message="Không tìm thấy người dùng nào." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Số điện thoại</th>
                <th className="px-4 py-3">Vai trò</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Ngày tạo</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 text-slate-600">{user.phoneNumber}</td>
                  <td className="px-4 py-3">
                    <Badge color={user.roleName === "Admin" ? "brand" : "slate"}>
                      {user.roleName}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={user.isActive ? "emerald" : "red"}>
                      {user.isActive ? "Hoạt động" : "Khóa"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/users/${user.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      Xem
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data && data.totalCount > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Tổng {data.totalCount} người dùng · Trang {data.page}/{Math.max(data.totalPages, 1)}
          </p>
          <div className="flex items-center gap-2">
            <Select
              aria-label="Số dòng mỗi trang"
              className="w-24"
              value={pageSize}
              onChange={(e) => setParams({ pageSize: Number(e.target.value), page: 1 })}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} / trang
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setParams({ page: page - 1 })}
            >
              Trước
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => setParams({ page: page + 1 })}
            >
              Sau
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <UsersPageInner />
    </Suspense>
  );
}
