import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string; email?: string }>;
}) {
  const store = await cookies();
  if (store.get("mc_access")?.value) redirect("/dashboard");

  const { next, registered, email } = await searchParams;
  return (
    <LoginForm
      next={next}
      registered={registered === "1"}
      email={email && email.length <= 256 ? email : undefined}
    />
  );
}
