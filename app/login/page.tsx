import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/app/auth/AuthForms";
import AuthShell from "@/components/AuthShell";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { user } = await getSession();
  const { next } = await searchParams;
  if (user) redirect(next || "/dashboard");
  return <AuthShell title="Welcome back" subtitle="Log in to see your dashboard and Freedom Plan."><LoginForm next={next} /></AuthShell>;
}
