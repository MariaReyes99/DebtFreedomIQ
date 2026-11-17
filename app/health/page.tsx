import Image from "next/image";
import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { track } from "@/lib/events";
import HealthWizard from "@/components/HealthWizard";
import Steps from "@/components/Steps";
import { Badge, Button } from "@/components/ui";
import HealthResults from "@/components/HealthResults";
import { matchHelp } from "@/lib/help";
import { toCountryCode, DEFAULT_COUNTRY } from "@/lib/countries";

export const metadata = { title: "Free Financial Health Check" };

export default async function HealthPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const { user, country, geo, isPremium } = await getSession();
  const latest = user ? await loadLatest(user.id) : null;
  const showSaved = Boolean(latest && !latest.incomplete && !edit);
  if (!showSaved) await track("assessment_started", { userId: user?.id, country: country?.code ?? geo.detected });
  return (
    <>
      <Steps />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-navy-900">
          <Image src="/images/family-kitchen-table.jpg" alt="" fill priority className="object-cover opacity-40" sizes="100vw" />
          <div className="relative p-6 sm:p-10">
            <Badge tone="teal">Free forever</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Financial Health Check</h1>
            <p className="mt-2 max-w-xl text-lg text-navy-100">{showSaved ? "Your scores, cash flow, charts and next steps." : "About 10 minutes. See where you stand, what's good, what needs attention, and what to do next."}</p>
          </div>
        </div>
        {showSaved && latest ? (<>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm text-teal-900"><strong>Your Financial Health</strong> from your check on {new Date(latest.createdAt).toLocaleDateString()}. Has anything changed?</p>
            <Button href="/health?edit=1" size="sm">✏️ Edit my answers</Button>
          </div>
          <HealthResults input={latest.input} metrics={latest.metrics} advice={latest.advice} help={matchHelp(latest.input, latest.metrics)}
            countryCode={toCountryCode(latest.input.country) ?? DEFAULT_COUNTRY} loggedIn saved isPremium={isPremium} assessmentId={latest.id} completedSteps={latest.completedSteps} />
        </>) : (<>
          {latest && <p className="mb-3 text-sm text-navy-600">We&apos;ve filled in your last answers from {new Date(latest.createdAt).toLocaleDateString()}. Update anything that&apos;s changed, then click &ldquo;See my Financial Health&rdquo;.</p>}
          <HealthWizard countryCode={country?.code ?? null} detected={geo.detected} loggedIn={Boolean(user)} isPremium={isPremium} initial={latest?.input ?? null} />
        </>)}
      </div>
    </>
  );
}
