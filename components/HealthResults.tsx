import Link from "next/link";
import type { Advice, AssessmentInput, HelpCategory, Metrics } from "@/lib/types";
import { COUNTRIES, money, crisisLabel, type CountryCode } from "@/lib/countries";
import { HELP_CATEGORIES } from "@/lib/help";
import { dataWarnings } from "@/lib/finance";
import { Badge, Button, Card, ScoreRing, StatCard, Disclaimer, cx } from "./ui";
import { ExpenseDonut, BalanceBars, DebtBars } from "./charts";
import NextSteps from "./NextSteps";
import GapPlan from "./GapPlan";
import { buildSolutions } from "@/lib/solutions";

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const impactTone = { high: "red", medium: "amber", low: "gray" } as const;

export default function HealthResults({ input, metrics: m, advice, help, countryCode, loggedIn, saved, isPremium, assessmentId, completedSteps }: {
  input: AssessmentInput; metrics: Metrics; advice: Advice; help: { category: HelpCategory; why: string }[];
  countryCode: CountryCode; loggedIn: boolean; saved: boolean; isPremium: boolean; assessmentId?: string | null; completedSteps?: number[];
}) {
  const c = COUNTRIES[countryCode];
  const f = (v: number) => money(c, v);
  const crisis = input.situation.cantAffordFood || input.situation.housingAtRisk || input.situation.distressed || m.stressScore >= 75;
  const dtiTone = m.debtToIncome <= 0.2 ? "good" : m.debtToIncome <= 0.36 ? "warn" : "bad";
  const expenseData = [...input.expenses.map(e => ({ name: e.category, value: e.amount })), { name: "Debt repayments", value: m.monthlyDebtPayments }];

  const warnings = dataWarnings(input, m, f);
  return (
    <div className="space-y-6" id="results">
      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900" role="status">
          <p className="font-bold">Some numbers may be missing or in the wrong unit, which can make your scores look worse than they are:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>
          <p className="mt-2 text-sm">Use <strong>Edit my answers</strong> above to fix them.</p>
        </div>
      )}
      {crisis && (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
          <p className="font-bold">You don&apos;t have to handle this alone.</p>
          <p className="mt-1 text-sm">Free, confidential support is available now. <strong>{c.firstCall.name}</strong>{c.firstCall.phone && <> on <a className="font-semibold underline" href={`tel:${c.firstCall.phone.replace(/[^\d+]/g, "")}`}>{c.firstCall.phone}</a></>} can help with money worries. If you&apos;re feeling overwhelmed, {crisisLabel(c.crisis.name, c.crisis.phone)} <a className="font-semibold underline" href={`tel:${c.crisis.phone?.replace(/[^\d+]/g, "")}`}>{c.crisis.phone}</a>. In an emergency call {c.emergency}.</p>
        </div>
      )}

      {/* Scores */}
      <Card className="bg-gradient-to-br from-navy-900 to-navy-800 text-white">
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <div className="flex justify-center gap-6 rounded-2xl bg-white p-4">
            <ScoreRing value={m.healthScore} label="Financial Health" sub={m.healthBand} />
            <ScoreRing value={m.stressScore} label="Financial Stress" sub={m.stressBand} invert />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="teal">{advice.source === "openai" ? "✨ AI analysis" : "Smart analysis"}</Badge>
              {saved ? <Badge tone="green">✓ Saved to your account</Badge> : loggedIn ? <Badge tone="red">⚠ Not saved: database problem</Badge> : <Badge tone="gray">Not saved</Badge>}
            </div>
            <p className="mt-3 text-lg leading-relaxed text-navy-50">{advice.summary}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Net worth" icon="🏦" value={f(m.netWorth)} tone={m.netWorth >= 0 ? "good" : "bad"} sub={`${f(m.totalAssets)} assets − ${f(m.totalDebts)} debts`} />
        <StatCard label="Debt-to-income" icon="⚖️" value={pct(m.debtToIncome)} tone={dtiTone} sub="Repayments ÷ income (aim < 36%)" />
        <StatCard label="Monthly surplus" icon="💧" value={f(m.monthlySurplus)} tone={m.monthlySurplus >= 0 ? "good" : "bad"} sub={m.monthlyIncome > 0 ? `${m.monthlySurplus >= 0 ? "Saving" : "Shortfall of"} ${pct(Math.abs(m.savingsRate))} of income` : "No income entered"} />
        <StatCard label="Emergency fund" icon="🛟" value={`${m.emergencyMonths.toFixed(1)} mo`} tone={m.emergencyMonths >= 3 ? "good" : m.emergencyMonths >= 1 ? "warn" : "bad"} sub={`Score ${m.emergencyScore}/100 · aim for 3–6 months`} />
        <StatCard label="High-interest debt" icon="🔥" value={pct(m.highInterestShare)} tone={m.highInterestShare > 0.3 ? "bad" : m.highInterestShare > 0 ? "warn" : "good"} sub="Share of debt at 15%+" />
      </div>

      {/* Recommendations */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card as="section">
          <h2 className="text-xl font-bold">Your top 5 recommendations</h2>
          <ol className="mt-4 space-y-3">
            {advice.recommendations.map((r, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-navy-100 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{r.title}</h3><Badge tone={impactTone[r.impact]}>{r.impact} impact</Badge></div>
                  <p className="mt-1 text-sm text-navy-600">{r.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <div className="space-y-6">
          <Card as="section" className="border-teal-200 bg-teal-50/60">
            <NextSteps steps={advice.nextSteps} assessmentId={assessmentId} initialDone={completedSteps} loggedIn={loggedIn} />
          </Card>
          <Card as="section">
            <h2 className="text-lg font-bold">Who could help you</h2>
            <ul className="mt-3 space-y-2">
              {help.slice(0, 3).map(h => <li key={h.category} className="flex items-start gap-3"><span aria-hidden className="text-xl">{HELP_CATEGORIES[h.category].icon}</span><div><p className="font-semibold">{HELP_CATEGORIES[h.category].label}</p><p className="text-sm text-navy-600">{h.why}</p></div></li>)}
            </ul>
            <Button href="/help" variant="secondary" size="sm" className="mt-4">Go to Find Help →</Button>
          </Card>
        </div>
      </div>

      <GapPlan options={buildSolutions(input, m, c, f)} gap={Math.max(0, -m.monthlySurplus)} fmt={f} />

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card as="section"><h2 className="mb-3 font-bold">Where your money goes each month</h2><ExpenseDonut data={expenseData} symbol={c.symbol} /></Card>
        <Card as="section"><h2 className="mb-3 font-bold">What you own vs owe</h2><BalanceBars assets={m.totalAssets} debts={m.totalDebts} savings={input.savings} symbol={c.symbol} /></Card>
        <Card as="section"><h2 className="mb-3 font-bold">Your debts</h2><DebtBars data={input.debts.filter(d => d.balance > 0).map(d => ({ name: d.name, balance: d.balance, rate: d.rate }))} symbol={c.symbol} /></Card>
      </div>

      {/* Upsell */}
      <Card className={cx("overflow-hidden p-0", "bg-navy-950 text-white")}>
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <Badge tone="teal">{isPremium ? "Premium unlocked" : "Premium · one-time"}</Badge>
            <h2 className="mt-3 text-2xl font-bold">See exactly when you could be debt-free</h2>
            <p className="mt-2 max-w-2xl text-navy-200">Your <strong>Freedom Plan</strong> compares Conservative, Balanced and Aggressive scenarios with monthly milestones, a payoff order, savings targets and a downloadable PDF.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
            {!loggedIn ? <Button href="/signup?next=/health" size="lg">Save my results (free)</Button>
              : <Button href={isPremium ? "/plan" : "/pricing"} size="lg">{isPremium ? "Open My Freedom Plan" : `Unlock for ${money(c, c.premiumPrice)}`}</Button>}
            <Link href="/plan" className="text-center text-sm text-teal-300 hover:text-teal-200">See an example plan →</Link>
          </div>
        </div>
      </Card>
      <Disclaimer />
    </div>
  );
}
