import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "@/app/auth/AuthForms";
import AuthShell from "@/components/AuthShell";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { user } = await getSession();
  const { next, error } = await searchParams;
  if (user) redirect(next || "/dashboard");
  return <AuthShell title="Welcome back" subtitle="Log in to see your dashboard and Freedom Plan.">{error === "link" && <p role="alert" className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">That email link has expired or was already used. Please log in, or use &quot;Forgot password?&quot; to get a new link.</p>}<LoginForm next={next} /></AuthShell>;
}
