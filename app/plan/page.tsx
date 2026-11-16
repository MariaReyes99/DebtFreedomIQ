import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { scenariosFor, ruleSummary, defaultGoals } from "@/lib/plan-server";
import { calculate } from "@/lib/finance";
import { EXAMPLE_HOUSEHOLD } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";
import { money, toCountryCode, DEFAULT_COUNTRY, COUNTRIES } from "@/lib/countries";
import { fmtMonths } from "@/lib/plan";
import { track } from "@/lib/events";
import PlanView, { type PlanData } from "@/components/PlanView";
import GeneratePlanButton from "@/components/GeneratePlanButton";
import { Badge, Button, Card, PageHeader, PremiumGate, Disclaimer } from "@/components/ui";

export const metadata = { title: "My Freedom Plan" };

export default async function PlanPage() {
  const { user, country, displayCountry, isPremium } = await getSession();
  const latest = user ? await loadLatest(user.id) : null;
  const c = country ?? displayCountry;
  await track("premium_view", { userId: user?.id, country: c.code, props: { page: "plan", premium: isPremium } });

  // Premium with a saved plan → full, editable plan
  if (user && isPremium && latest) {
    const supabase = await createClient();
    const { data: saved } = await supabase.from("financial_plans").select("id,created_at,strategy,scenarios,ai_summary,goals").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const cc = toCountryCode(latest.input.country) ?? DEFAULT_COUNTRY;
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <PageHeader eyebrow="Premium" title="My Freedom Plan">Three ways to become debt-free, built from your latest Financial Health check ({new Date(latest.createdAt).toLocaleDateString()}).</PageHeader>
        {saved ? (
          <PlanView countryCode={cc} editable hasConsumerDebt={latest.metrics.consumerDebts > 0}
            plan={{ id: saved.id, createdAt: saved.created_at, strategy: saved.strategy, scenarios: saved.scenarios, summary: saved.ai_summary, goals: saved.goals } as PlanData} />
        ) : (
          <Card className="text-center"><h2 className="text-xl font-bold">Ready to build your Freedom Plan</h2><p className="mx-auto mt-2 max-w-lg text-navy-600">We&apos;ll model Conservative, Balanced and Aggressive scenarios from your latest numbers and save the plan to your account.</p><div className="mt-5 flex justify-center"><GeneratePlanButton /></div></Card>
        )}
        <Disclaimer className="mt-6" />
      </div>
    );
  }

  // Everyone else → preview (their own numbers if they have a check, otherwise the example household)
  const input = latest?.input ?? { ...EXAMPLE_HOUSEHOLD, country: c.code };
  const m = latest?.metrics ?? calculate(input);
  const cc = toCountryCode(input.country) ?? DEFAULT_COUNTRY;
  const scenarios = scenariosFor(input, m, "avalanche");
  const summary = ruleSummary(input, m, scenarios);
  const preview: PlanData = { strategy: "avalanche", scenarios, summary: { ...summary, source: "rules" }, goals: defaultGoals(input, m, scenarios) };
  const bal = scenarios.find(s => s.key === "balanced")!;
  const price = money(COUNTRIES[cc], COUNTRIES[cc].premiumPrice);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow={latest ? "Your preview" : "Example plan"} title="My Freedom Plan"
        actions={!user ? <Button href="/signup?next=/health">Start free</Button> : !latest ? <Button href="/health">Do your Financial Health check</Button> : <Button href="/pricing">Unlock for {price}</Button>}>
        {latest ? "Here's a sneak peek built from your own numbers." : "This example uses a sample family. Do your free Financial Health check to see your own."}
      </PageHeader>

      <Card className="mb-6 bg-gradient-to-br from-navy-900 to-navy-800 text-white">
        <Badge tone="teal">{latest ? "Based on your numbers" : "Example household"}</Badge>
        <p className="mt-3 text-2xl font-bold">{summary.headline}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {scenarios.map(s => (
            <div key={s.key} className="rounded-xl bg-white/10 p-4">
              <p className="text-sm text-navy-200">{s.label}</p>
              <p className="text-xl font-bold">{m.consumerDebts > 0 ? fmtMonths(s.consumerDebtFreeMonth) : fmtMonths(s.mortgageFreeMonth)}</p>
              <p className="text-xs text-navy-300">{m.consumerDebts > 0 ? "to consumer debt-free" : "to mortgage-free"}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-navy-200">Over the life of your debts, the Balanced plan saves about <strong className="text-white">{money(COUNTRIES[cc], Math.max(0, scenarios.find(s => s.key === "conservative")!.totalInterest - bal.totalInterest))}</strong> in interest compared with Conservative.</p>
      </Card>

      <PremiumGate title="Unlock your full Freedom Plan" price={price}>
        <PlanView countryCode={cc} plan={preview} editable={false} hasConsumerDebt={m.consumerDebts > 0} />
      </PremiumGate>
      <Disclaimer className="mt-6" />
    </div>
  );
}
