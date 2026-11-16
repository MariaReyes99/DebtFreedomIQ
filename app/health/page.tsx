import Image from "next/image";
import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { track } from "@/lib/events";
import HealthWizard from "@/components/HealthWizard";
import Steps from "@/components/Steps";
import { Badge } from "@/components/ui";

export const metadata = { title: "Free Financial Health Check" };

export default async function HealthPage() {
  const { user, country, geo, isPremium } = await getSession();
  const latest = user ? await loadLatest(user.id) : null;
  await track("assessment_started", { userId: user?.id, country: country?.code ?? geo.detected });
  return (
    <>
      <Steps />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-navy-900">
          <Image src="/images/family-kitchen-table.jpg" alt="" fill priority className="object-cover opacity-40" sizes="100vw" />
          <div className="relative p-6 sm:p-10">
            <Badge tone="teal">Free forever</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Financial Health Check</h1>
            <p className="mt-2 max-w-xl text-lg text-navy-100">About 10 minutes. Get your Financial Health score, net worth, debt-to-income ratio and personalised next steps.</p>
          </div>
        </div>
        {latest && <p className="mb-3 text-sm text-navy-600">We&apos;ve filled in your last answers from {new Date(latest.createdAt).toLocaleDateString()}. Update anything that&apos;s changed.</p>}
        <HealthWizard countryCode={country?.code ?? null} detected={geo.detected} loggedIn={Boolean(user)} isPremium={isPremium} initial={latest?.input ?? null} />
      </div>
    </>
  );
}
