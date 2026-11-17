import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { createClient } from "@/lib/supabase/server";
import { COUNTRIES, DEFAULT_COUNTRY, money, toCountryCode } from "@/lib/countries";
import { fmtMonths } from "@/lib/plan";
import type { Goal } from "@/lib/types";
import type { ScenarioResult } from "@/lib/plan";
import { ScoreHistory } from "@/components/charts";
import NextSteps from "@/components/NextSteps";
import CashRunway from "@/components/CashRunway";
import PendingCheckSaver from "@/components/PendingCheckSaver";
import TodayActions from "@/components/TodayActions";
import { buildFreedomPlan } from "@/lib/freedom";
import type { Choices } from "@/lib/whatif";
import { Badge, Button, Card, PageHeader, ScoreRing, StatCard } from "@/components/ui";

export const metadata = { title: "Home" };

export default async function Dashboard() {
  const { user, displayName, isPremium, country, displayCountry } = await getSession();
  if (!user) redirect("/login?next=/dashboard");
  const supabase = await createClient();
  const [latest, { data: history }, { data: plan }] = await Promise.all([
    loadLatest(user.id),
    supabase.from("financial_assessments").select("created_at,health_score,stress_score").eq("user_id", user.id).order("created_at", { ascending: true }).limit(24),
    supabase.from("financial_plans").select("id,scenarios,ai_summary,goals,updated_at,choices,steps_done").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const c = latest ? COUNTRIES[toCountryCode(latest.input.country) ?? DEFAULT_COUNTRY] : country ?? displayCountry;
  const f = (v: number) => money(c, v);

  if (!latest) {
    const plan = isPremium ? "Premium" : "Free";
    const steps = [
      { n: 1, icon: "🩺", title: "Financial Health check", body: "Enter your income, bills, debts and what you own. You get your health and stress scores, warnings and a step-by-step plan.", href: "/health", cta: "Start (about 10 min)", primary: true, badge: "Free" },
      { n: 2, icon: "🤝", title: "Find Help", body: `Free and not-for-profit services near you in ${c.name}: budgeting advice, food, housing, health bills and government support.`, href: "/help", cta: "See help near me", badge: "Free categories" },
      { n: 3, icon: "🧭", title: "My Freedom Plan", body: "Three payoff scenarios with dates, milestones and the order to pay each debt.", href: isPremium ? "/plan" : "/pricing", cta: isPremium ? "Open my plan" : "See Premium", badge: "Premium" },
    ];
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome, {displayName} 👋</h1>
          <p className="mt-2 text-navy-600">This is your home page. Once you&apos;ve done your Financial Health check, your scores, progress and next steps will show here.</p>
          <p className="mt-3"><Badge tone={isPremium ? "teal" : "gray"}>{plan} plan</Badge> <Badge tone="gray">📍 {c.name}</Badge></p>
        </div>
        <PendingCheckSaver />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(s => (
            <Card key={s.n} className={`flex flex-col ${s.primary ? "border-teal-300 ring-2 ring-teal-100" : ""}`}>
              <div className="flex items-center justify-between"><span className="text-3xl" aria-hidden>{s.icon}</span><Badge tone={s.badge === "Premium" ? "navy" : "teal"}>{s.badge}</Badge></div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal-700">Step {s.n}</p>
              <h2 className="text-lg font-bold">{s.title}</h2>
              <p className="mt-1 flex-1 text-sm text-navy-600">{s.body}</p>
              <Button href={s.href} variant={s.primary ? "primary" : "secondary"} className="mt-4" full>{s.cta}</Button>
            </Card>
          ))}
        </div>
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 bg-navy-50">
          <p className="text-sm text-navy-700">Need to talk to someone now? <strong>{c.firstCall?.name ?? "A free financial mentor"}</strong>{c.firstCall?.phone ? <> on <a className="font-semibold text-teal-700" href={`tel:${c.firstCall.phone.replace(/\s/g, "")}`}>{c.firstCall.phone}</a></> : null} can help for free.</p>
          <Link href="/account" className="text-sm font-semibold text-teal-700">My account →</Link>
        </Card>
      </div>
    );
  }

  const m = latest.metrics;
  const rec = plan?.ai_summary?.recommendedScenario as string | undefined;
  const sc = (plan?.scenarios as ScenarioResult[] | undefined)?.find(s => s.key === rec);
  const first = history?.[0];
  const delta = first && history!.length > 1 ? m.healthScore - (first.health_score ?? 0) : null;

  const fp = isPremium && plan && !latest.incomplete ? buildFreedomPlan(latest.input, (plan.choices ?? null) as Choices | null, c, f) : null;
  const firstStep = latest.advice.nextSteps[0];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Home" title={`Hi ${displayName} 👋`} actions={<><Button href="/health" variant="secondary">↻ Update my numbers</Button><Button href={isPremium ? "/plan" : "/pricing"}>{isPremium ? "My Freedom Plan" : "Unlock Premium"}</Button></>}>
        Last check: {new Date(latest.createdAt).toLocaleString("en-NZ", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })} · <a href="/health?edit=1" className="font-semibold text-teal-700 hover:underline">Edit my answers</a> {isPremium ? <Badge tone="teal" className="ml-2">Premium</Badge> : <Badge tone="gray" className="ml-2">Free plan</Badge>}
      </PageHeader>

      {/* The single most useful thing to do next */}
      {fp ? <div className="mb-6"><TodayActions steps={[...fp.stabilise.steps, ...fp.buffer.steps]} planId={plan!.id} initialDone={(plan!.steps_done ?? []) as string[]} /></div>
        : <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-teal-300 bg-teal-50"><div><p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Next recommended action</p><p className="mt-1 text-lg font-bold">{m.monthlySurplus < 0 ? `Close your ${f(-m.monthlySurplus)}/month gap` : firstStep ?? "Make your step-by-step plan"}</p>{m.monthlySurplus < 0 && firstStep && <p className="text-sm text-navy-700">Start with: {firstStep}</p>}</div><Button href={isPremium ? "/plan" : "/pricing"}>{isPremium ? "Make my plan" : "Get my step-by-step plan"}</Button></Card>}

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card className="flex items-center justify-center gap-8">
          <ScoreRing value={m.healthScore} label="Financial Health" sub={m.healthBand} />
          <ScoreRing value={m.stressScore} label="Stress" sub={m.stressBand} invert />
        </Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Your financial position" value={f(m.netWorth)} tone={m.netWorth >= 0 ? "good" : "bad"} sub={`${f(m.totalAssets)} owned − ${f(m.totalDebts)} owed`} />
          <StatCard label="Debt load" value={`${(m.debtToIncome * 100).toFixed(0)}%`} tone={m.debtToIncome <= 0.36 ? "good" : "bad"} sub="of income on repayments · healthy below 36%" />
          <StatCard label="Monthly surplus" value={f(m.monthlySurplus)} tone={m.monthlySurplus >= 0 ? "good" : "bad"} />
          <StatCard label="Safety savings" value={`${m.emergencyMonths.toFixed(1)} months`} tone={m.emergencyMonths >= 3 && m.monthlySurplus >= 0 ? "good" : "warn"} sub="of essential costs · aim for 3–6" />
          <Card className="col-span-2 md:col-span-4">
            <p className="text-sm text-navy-600"><strong>What you own (in this check):</strong> {[...latest.input.assets.filter(x => x.value > 0).map(x => `${x.name} ${f(x.value)}`), ...(latest.input.savings > 0 ? [`Savings ${f(latest.input.savings)}`] : [])].join(" · ") || "nothing entered"}. Missing something? <a href="/health?edit=1" className="font-semibold text-teal-700">Edit my answers</a>, then click &ldquo;See my Financial Health&rdquo; to save.</p>
          </Card>
          <Card className="col-span-2 md:col-span-4">
            <p className="text-sm text-navy-500">{delta === null ? "Do another check next month to start tracking your progress." : delta === 0 ? "Your health score is the same as your first check." : delta > 0 ? `📈 Your health score is up ${delta} points since your first check.` : `Your health score is down ${-delta} points since your first check. Let's look at why.`}</p>
          </Card>
        </div>
      </div>

      <div className="mt-6"><CashRunway income={m.monthlyIncome} living={m.monthlyExpenses} debt={m.monthlyDebtPayments} savings={latest.input.savings} symbol={c.symbol} fmt={f} /></div>

      <Card as="section" className="mt-6 border-teal-200 bg-teal-50/60">
        <NextSteps steps={latest.advice.nextSteps} assessmentId={latest.id} initialDone={latest.completedSteps} loggedIn />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card as="section">
          <h2 className="text-lg font-bold">Your progress</h2>
          {history && history.length > 1
            ? <ScoreHistory data={history.map(h => ({ date: new Date(h.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }), health: h.health_score ?? 0, stress: h.stress_score ?? 0 }))} />
            : <p className="mt-2 text-sm text-navy-500">Your score history appears here after your second check.</p>}
        </Card>
        <Card as="section">
          <h2 className="text-lg font-bold">Top recommendations</h2>
          <ol className="mt-3 space-y-2">{latest.advice.recommendations.slice(0, 3).map((r, i) => <li key={i} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-white">{i + 1}</span><span><strong>{r.title}</strong><br /><span className="text-sm text-navy-600">{r.detail}</span></span></li>)}</ol>
          <Link href="/health" className="mt-3 inline-block text-sm font-semibold text-teal-700">See full results →</Link>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card as="section">
          <h2 className="text-lg font-bold">My Freedom Plan</h2>
          {plan && sc ? (<>
            <p className="mt-2 text-navy-700">{plan.ai_summary.headline}</p>
            <p className="mt-2 text-sm text-navy-500">{sc.label} plan · consumer debt-free in <strong>{fmtMonths(sc.consumerDebtFreeMonth)}</strong></p>
            <Button href="/plan" variant="secondary" size="sm" className="mt-3">Open plan</Button>
          </>) : isPremium ? (<><p className="mt-2 text-navy-600">You haven&apos;t generated your plan yet.</p><Button href="/plan" size="sm" className="mt-3">Generate my plan</Button></>)
            : (<><p className="mt-2 text-navy-600">See when you could be debt-free with three scenarios, milestones and a PDF.</p><Button href="/plan" size="sm" className="mt-3">Preview my plan</Button></>)}
        </Card>
        <Card as="section">
          <h2 className="text-lg font-bold">Goals</h2>
          {(plan?.goals as Goal[] | undefined)?.length ? (
            <ul className="mt-3 space-y-3">{(plan!.goals as Goal[]).slice(0, 4).map(g => { const p = g.target ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0; return (
              <li key={g.id}><div className="flex justify-between text-sm"><span className="font-semibold">{g.title}</span><span>{p}%</span></div><div className="mt-1 h-2 rounded-full bg-navy-100" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={g.title}><div className="h-full rounded-full bg-teal-500" style={{ width: `${p}%` }} /></div></li>); })}</ul>
          ) : <p className="mt-2 text-sm text-navy-500">Goals appear here once you create your Freedom Plan.</p>}
        </Card>
      </div>
    </div>
  );
}
