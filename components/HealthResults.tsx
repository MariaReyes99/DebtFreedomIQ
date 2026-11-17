import Link from "next/link";
import type { Advice, AssessmentInput, HelpCategory, Metrics } from "@/lib/types";
import { COUNTRIES, money, crisisLabel, type CountryCode } from "@/lib/countries";
import { HELP_CATEGORIES } from "@/lib/help";
import { dataWarnings } from "@/lib/finance";
import { Badge, Button, Card, ScoreRing, StatCard, Disclaimer, cx } from "./ui";
import { ExpenseDonut, BalanceBars, DebtBars } from "./charts";
import NextSteps from "./NextSteps";
import GapPlan from "./GapPlan";
import CashRunway from "./CashRunway";
import DoFirst from "./DoFirst";
import { buildSolutions } from "@/lib/solutions";
import { insights, soWhat, LABELS } from "@/lib/insights";

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
  const ins = insights(input, m, f);
  const sw = soWhat(input, m, f);
  // Weighted average interest rate and the monthly interest cost on what's owed
  const owing = input.debts.filter(d => d.balance > 0);
  const owed = owing.reduce((t, d) => t + d.balance, 0);
  const avgRate = owed > 0 ? owing.reduce((t, d) => t + d.balance * d.rate, 0) / owed : null;
  const interestPerMonth = owing.reduce((t, d) => t + d.balance * (d.rate / 100) / 12, 0);
  return (
    <div className="space-y-6" id="results">
      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900" role="status">
          <p className="font-bold">Some numbers may be missing or in the wrong unit, which can make your scores look worse than they are:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul>
          <p className="mt-2 text-sm">Use <strong>Edit my answers</strong> to fix them.</p>
        </div>
      )}
      {/* 1. Your situation */}
      <section aria-labelledby="situation">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 id="situation" className="text-xl font-bold">Your situation</h2>
          <Badge tone={m.healthScore < 40 || m.monthlySurplus < 0 ? "amber" : "green"}>{m.healthScore < 25 ? "Needs attention now" : m.healthScore < 40 || m.monthlySurplus < 0 ? "Needs attention soon" : m.healthScore < 70 ? "Getting there" : "In good shape"}</Badge>
          {saved ? <Badge tone="green">✓ Saved to your account</Badge> : loggedIn ? <Badge tone="red">⚠ Not saved: database problem</Badge> : <Badge tone="gray">Not saved yet</Badge>}
        </div>
      {/* Actions first: what's good, what needs attention, what to do next */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card as="section" className="border-emerald-200 bg-emerald-50/50">
          <h2 className="text-lg font-bold">✅ What&apos;s good</h2>
          <ul className="mt-2 space-y-2 text-[15px]">{ins.good.length ? ins.good.map(x => <li key={x.title}><strong>{x.title}.</strong> <span className="text-navy-700">{x.detail}</span></li>) : <li className="text-navy-600">Doing this check is a good first step.</li>}</ul>
        </Card>
        <Card as="section" className="border-amber-200 bg-amber-50/60">
          <h2 className="text-lg font-bold">⚠️ What needs attention</h2>
          <ul className="mt-2 space-y-2 text-[15px]">{ins.attention.length ? ins.attention.map(x => <li key={x.title}><strong>{x.title}.</strong> <span className="text-navy-700">{x.detail}</span></li>) : <li className="text-navy-600">Nothing urgent. Keep going.</li>}</ul>
        </Card>
        <Card as="section" className="border-teal-300 bg-teal-50">
          <h2 className="text-lg font-bold">👉 What to do next</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[15px]">{advice.nextSteps.slice(0, 3).map((x, k) => <li key={k}>{x}</li>)}</ol>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button href={isPremium ? "/plan" : loggedIn ? "/pricing" : "/signup?next=/health"} size="sm">{isPremium ? "Open my step-by-step plan" : loggedIn ? "Get my step-by-step plan" : "Save my results (free)"}</Button>
            <Button href="/help" size="sm" variant="secondary">Get help</Button>
          </div>
        </Card>
      </div>

      </section>

      {/* 2. Do these first */}
      <DoFirst input={input} m={m} c={c} />

      {/* 3. Recovery options */}
      <GapPlan options={buildSolutions(input, m, c, f)} gap={Math.max(0, -m.monthlySurplus)} fmt={f} />

      {/* 4. Explore my future (optional) */}
      <Card as="section" className="border-navy-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-navy-500">Explore my future · not required today</p>
            <h2 className="mt-1 text-lg font-bold">Want to compare different approaches?</h2>
            <p className="text-sm text-navy-600">Try a move and see where it takes your cash, debts and retirement.</p>
          </div>
          <Button href="/whatif" variant="secondary">Open scenario planner →</Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["🏠", "Property options", "sell-rental"], ["📈", "Investment options", "investments"], ["💳", "Debt options", "interest-only"], ["🌅", "Retirement impact", ""]].map(([i, l, t]) => (
            <a key={l} href={t ? `/whatif?try=${t}` : "/whatif"} className="rounded-xl border border-navy-100 p-3 text-sm font-semibold hover:border-teal-400 hover:bg-teal-50"><span className="mr-1" aria-hidden>{i}</span>{l}</a>
          ))}
        </div>
      </Card>

      <h2 className="text-lg font-bold">Your numbers, explained</h2>
      {/* Scores */}
      <Card className="bg-gradient-to-br from-navy-900 to-navy-800 text-white">
        <div className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
          <div className="flex justify-center gap-6 rounded-2xl bg-white p-4">
            <ScoreRing value={m.healthScore} label="Financial Health" sub={m.healthBand} />
            <ScoreRing value={m.stressScore} label="Money stress" sub={m.stressBand} invert />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="teal">Your personalised guidance</Badge>
              
            </div>
            <p className="mt-3 text-lg leading-relaxed text-navy-50">{advice.summary}</p>
          </div>
        </div>
      </Card>


      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label={LABELS.netWorth} icon="🏦" value={f(m.netWorth)} tone={m.netWorth >= 0 ? "good" : "bad"} sub={sw.netWorth} />
        <StatCard label={LABELS.dti} icon="⚖️" value={pct(m.debtToIncome)} tone={dtiTone} sub={sw.dti} />
        <StatCard label={LABELS.surplus} icon="💧" value={f(m.monthlySurplus)} tone={m.monthlySurplus >= 0 ? "good" : "bad"} sub={sw.surplus} />
        <StatCard label={LABELS.safety} icon="🛟" value={`${m.emergencyMonths.toFixed(1)} months`} tone={m.emergencyMonths >= 3 && m.monthlySurplus >= 0 ? "good" : m.emergencyMonths >= 1 ? "warn" : "bad"} sub={sw.safety} />
        <StatCard label={LABELS.interest} icon="🔥" value={avgRate === null ? "—" : `${avgRate.toFixed(1)}% avg`} tone={m.highInterestShare > 0.3 ? "bad" : m.highInterestShare > 0 ? "warn" : "navy"}
          sub={avgRate === null ? "No debts entered" : `About ${f(interestPerMonth)} a month goes on interest. ${m.highInterestShare > 0 ? `${pct(m.highInterestShare)} of your debt costs 15%+ a year.` : "No very expensive debt (15%+)."}`} />
      </div>

      <CashRunway income={m.monthlyIncome} living={m.monthlyExpenses} debt={m.monthlyDebtPayments} savings={input.savings} symbol={c.symbol} fmt={f} />

      {/* Recommendations */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card as="section">
          <h2 className="text-xl font-bold">Your top 5 recommendations</h2><p className="mt-1 text-sm text-navy-600">In order of what matters most.</p>
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


      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card as="section"><h2 className="mb-3 font-bold">Where your money goes each month</h2><ExpenseDonut data={expenseData} symbol={c.symbol} /></Card>
        <Card as="section"><h2 className="mb-3 font-bold">Things you own vs money you owe</h2><BalanceBars assets={m.totalAssets} debts={m.totalDebts} savings={input.savings} symbol={c.symbol} /></Card>
        <Card as="section"><h2 className="mb-3 font-bold">Your debts</h2><DebtBars data={input.debts.filter(d => d.balance > 0).map(d => ({ name: d.name, balance: d.balance, rate: d.rate }))} symbol={c.symbol} /></Card>
      </div>

      {/* Upsell */}
      <Card className={cx("overflow-hidden p-0", "bg-navy-950 text-white")}>
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <Badge tone="teal">{isPremium ? "Premium unlocked" : "Premium · one-time"}</Badge>
            <h2 className="mt-3 text-2xl font-bold">See exactly when you could be debt-free</h2>
            <p className="mt-2 max-w-2xl text-navy-200">Your <strong>Freedom Plan</strong> turns this into dated steps you can tick off: stop the money running out, build safety savings, then pay debt down. Download it as a PDF.</p>
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
