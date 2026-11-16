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
import { Badge, Button, Card, PageHeader, ScoreRing, StatCard } from "@/components/ui";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const { user, displayName, isPremium, country, displayCountry } = await getSession();
  if (!user) redirect("/login?next=/dashboard");
  const supabase = await createClient();
  const [latest, { data: history }, { data: plan }] = await Promise.all([
    loadLatest(user.id),
    supabase.from("financial_assessments").select("created_at,health_score,stress_score").eq("user_id", user.id).order("created_at", { ascending: true }).limit(24),
    supabase.from("financial_plans").select("scenarios,ai_summary,goals,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const c = latest ? COUNTRIES[toCountryCode(latest.input.country) ?? DEFAULT_COUNTRY] : country ?? displayCountry;
  const f = (v: number) => money(c, v);

  if (!latest) return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Welcome, {displayName} 👋</h1>
      <p className="mt-2 text-navy-600">Start with your free Financial Health check. It takes about 10 minutes.</p>
      <Button href="/health" size="lg" className="mt-6">Start my Financial Health check</Button>
    </div>
  );

  const m = latest.metrics;
  const rec = plan?.ai_summary?.recommendedScenario as string | undefined;
  const sc = (plan?.scenarios as ScenarioResult[] | undefined)?.find(s => s.key === rec);
  const first = history?.[0];
  const delta = first && history!.length > 1 ? m.healthScore - (first.health_score ?? 0) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Dashboard" title={`Hi ${displayName} 👋`} actions={<><Button href="/health" variant="secondary">↻ Update my numbers</Button><Button href={isPremium ? "/plan" : "/pricing"}>{isPremium ? "My Freedom Plan" : "Unlock Premium"}</Button></>}>
        Last check: {new Date(latest.createdAt).toLocaleDateString()} {isPremium ? <Badge tone="teal" className="ml-2">Premium</Badge> : <Badge tone="gray" className="ml-2">Free plan</Badge>}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card className="flex items-center justify-center gap-8">
          <ScoreRing value={m.healthScore} label="Financial Health" sub={m.healthBand} />
          <ScoreRing value={m.stressScore} label="Stress" sub={m.stressBand} invert />
        </Card>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Net worth" value={f(m.netWorth)} tone={m.netWorth >= 0 ? "good" : "bad"} />
          <StatCard label="Debt-to-income" value={`${(m.debtToIncome * 100).toFixed(0)}%`} tone={m.debtToIncome <= 0.36 ? "good" : "bad"} />
          <StatCard label="Monthly surplus" value={f(m.monthlySurplus)} tone={m.monthlySurplus >= 0 ? "good" : "bad"} />
          <StatCard label="Emergency fund" value={`${m.emergencyMonths.toFixed(1)} mo`} tone={m.emergencyMonths >= 3 ? "good" : "warn"} />
          <Card className="col-span-2 md:col-span-4">
            <p className="text-sm text-navy-500">{delta === null ? "Do another check next month to start tracking your progress." : delta >= 0 ? `📈 Your health score is up ${delta} points since your first check.` : `Your health score is down ${-delta} points since your first check. Let's look at why.`}</p>
          </Card>
        </div>
      </div>

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
