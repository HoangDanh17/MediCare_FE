import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SessionProvider } from "@/hooks/use-session";
import { Shell } from "@/components/shell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cookie do trình duyệt tự đặt sau đăng nhập (JS) — vẫn gửi lên server khi SSR.
  const store = await cookies();
  if (!store.get("mc_access")?.value) redirect("/login");

  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
