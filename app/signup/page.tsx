import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignupForm } from "@/app/auth/AuthForms";
import AuthShell from "@/components/AuthShell";

export const metadata = { title: "Create your free account" };

export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { user, geo } = await getSession();
  const { next } = await searchParams;
  if (user) redirect(next || "/dashboard");
  return <AuthShell title="Create your free account" subtitle="Save your Financial Health results, track your progress and unlock your Freedom Plan."><SignupForm defaultCountry={geo.code} detected={geo.detected} next={next} /></AuthShell>;
}
