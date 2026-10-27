import { redirect } from "next/navigation";
import { SessionProvider } from "@/hooks/use-session";
import { Shell } from "@/components/shell";
import { hasSession } from "@/lib/server-auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cookie phiên do BFF đặt sau đăng nhập (httpOnly) — luôn gửi lên server khi SSR.
  if (!(await hasSession())) redirect("/login");

  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
