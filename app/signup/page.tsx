import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { SignupForm } from "@/app/auth/AuthForms";
import AuthShell from "@/components/AuthShell";

export const metadata = { title: "Create your free account" };

export default async function Signup({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { user, geo } = await getSession();
  const { next } = await searchParams;
  if (user) redirect(next || "/dashboard");
  const forPremium = /checkout|pricing|plan/.test(next ?? "");
  return (
    <AuthShell
      title={forPremium ? "Step 1 of 2: Create your account" : "Create your free account"}
      subtitle={forPremium ? "Premium is linked to your account so your Freedom Plan is saved and you can come back to it. Next, you'll go straight to checkout." : "Save your Financial Health results, track your progress and unlock your Freedom Plan."}>
      {forPremium && <ol className="mb-5 flex gap-2 text-sm font-semibold"><li className="rounded-full bg-teal-500 px-3 py-1 text-white">1. Account</li><li className="rounded-full bg-navy-100 px-3 py-1 text-navy-600">2. Payment</li></ol>}
      <SignupForm defaultCountry={geo.code} detected={geo.detected} next={next} />
    </AuthShell>
  );
}
