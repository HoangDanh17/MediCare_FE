import Link from "next/link";
import { Alert, Button } from "@/components/ui";

export function Forbidden({
  message = "Bạn không có quyền truy cập chức năng này.",
}: {
  message?: string;
}) {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-6xl font-bold text-slate-300">403</p>
      <h1 className="mt-2 text-xl font-semibold text-slate-900">Không có quyền</h1>
      <div className="mt-4">
        <Alert>{message}</Alert>
      </div>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/dashboard">
          <Button variant="secondary">Về tổng quan</Button>
        </Link>
      </div>
    </div>
  );
}
