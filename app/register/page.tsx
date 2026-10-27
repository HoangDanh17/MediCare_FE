import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { hasSession } from "@/lib/server-auth";

export default async function RegisterPage() {
  if (await hasSession()) redirect("/dashboard");

  return <RegisterForm />;
}
