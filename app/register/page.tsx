import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const store = await cookies();
  if (store.get("mc_access")?.value) redirect("/dashboard");

  return <RegisterForm />;
}
