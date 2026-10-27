import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { hasSession } from "@/lib/server-auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string; email?: string }>;
}) {
  if (await hasSession()) redirect("/dashboard");

  const { next, registered, email } = await searchParams;
  return (
    <LoginForm
      next={next}
      registered={registered === "1"}
      email={email && email.length <= 256 ? email : undefined}
    />
  );
}
