"use client";
import { useState, useTransition } from "react";
import type { ScenarioResult, ScenarioKey, Strategy } from "@/lib/plan";
import { fmtMonths, monthToDate, SCENARIOS } from "@/lib/plan";
import type { Goal } from "@/lib/types";
import { COUNTRIES, money, type CountryCode } from "@/lib/countries";
import { Badge, Button, Card, cx } from "./ui";
import { ScenarioChart } from "./charts";

export type PlanData = {
  id?: string; createdAt?: string; strategy: Strategy; scenarios: ScenarioResult[];
  summary: { headline: string; recommendedScenario: ScenarioKey; why: string; tips: string[]; source: "openai" | "rules" };
  goals: Goal[];
};

export default function PlanView({ countryCode, plan: initial, editable, hasConsumerDebt, cash, embedded, paydownBlocked }: { countryCode: CountryCode; plan: PlanData; editable: boolean; hasConsumerDebt: boolean; cash?: { surplus: number; savings: number }; embedded?: boolean; paydownBlocked?: string }) {
  const c = COUNTRIES[countryCode];
  const f = (v: number) => money(c, v);
  const [plan, setPlan] = useState(initial);
  const [sel, setSel] = useState<ScenarioKey>(initial.summary.recommendedScenario);
  const [goals, setGoals] = useState<Goal[]>(initial.goals);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState(""); const [answer, setAnswer] = useState("");
  const [pending, start] = useTransition();
  const s = plan.scenarios.find(x => x.key === sel)!;
  const hasMortgage = plan.scenarios.some(x => x.mortgageFreeMonth !== null);
  const noExtra = plan.scenarios.every(x => x.monthlyToDebt <= 0);
  const debtCount = plan.scenarios[0]?.payoffOrder.length ?? 0;
  const short = cash && cash.surplus < 0 ? -cash.surplus : 0;
  const runOutMonths = short ? Math.max(0, cash!.savings) / short : null;
  const runOutDate = runOutMonths !== null ? new Date(Date.now() + runOutMonths * 30.4 * 864e5).toLocaleDateString("en-NZ", { month: "long", year: "numeric" }) : null;

  const regenerate = (strategy: Strategy) => start(async () => {
    setMsg("");
    const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strategy }) });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error); return; }
    setPlan(j); setGoals(j.goals); setSel(j.summary.recommendedScenario); setMsg("✓ New plan generated and saved.");
  });
  const saveGoals = () => start(async () => {
    const r = await fetch("/api/plan/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id, goals }) });
    setMsg(r.ok ? "✓ Goals saved." : "Couldn't save goals.");
  });
  const ask = () => start(async () => {
    setAnswer("");
    const r = await fetch("/api/plan/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) });
    const j = await r.json(); setAnswer(j.answer || j.error);
  });

  return (
    <div className="space-y-6">
      {/* How to read and use this plan */}
      {!embedded && <details className="no-print rounded-2xl border border-navy-100 bg-white p-5" open>
        <summary className="cursor-pointer text-lg font-bold">How this plan works and what to do 🧭</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-navy-700">
          <li><strong>Where the numbers come from:</strong> your latest Financial Health check (income, living costs, each debt&apos;s balance, interest rate and repayment, and your savings). Update the check and click <em>Rebuild my plan</em> whenever things change.</li>
          <li><strong>Three scenarios:</strong> each splits your spare money each month differently. <em>Conservative</em> builds savings first, <em>Balanced</em> splits it, <em>Aggressive</em> puts almost all of it on debt. Click a card to see its milestones and savings below.</li>
          <li><strong>Payoff method:</strong> decides which debt gets the <em>extra</em> money first: the highest interest rate (saves the most) or the smallest balance (quick wins). It only changes the result when there&apos;s spare money and more than one debt.</li>
          <li><strong>Debt-free timeline:</strong> how much you&apos;d owe over time under each scenario, assuming your repayments keep being made.</li>
          <li><strong>What to do:</strong> follow the milestones for the scenario you pick, set your goals at the bottom, and ask a what-if question if you&apos;re unsure.</li>
        </ol>
      </details>}

      {short > 0 && (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 text-red-900" role="alert">
          <p className="text-lg font-bold">First: close your {f(short)}/month shortfall</p>
          <p className="mt-1 text-sm">This plan assumes you keep making every repayment, but right now more goes out each month than comes in.{runOutDate && cash!.savings > 0 ? ` At this rate your ${f(cash!.savings)} savings run out around ${runOutDate}.` : ""} Until the gap is closed there&apos;s no spare money for extra repayments, so all three scenarios look almost the same.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button href="/health" size="sm">See &ldquo;Ways to close your gap&rdquo;</Button><Button href="/whatif" size="sm" variant="secondary">🧪 Test choices (what-if)</Button><Button href="/help" size="sm" variant="secondary">Find free help</Button></div>
        </div>
      )}

      {paydownBlocked ? (
        <Card className="border-amber-200 bg-amber-50"><p className="font-semibold text-amber-900">Payoff scenarios start after Stages 1 and 2</p><p className="mt-1 text-sm text-amber-900">{paydownBlocked}</p></Card>
      ) : (<>
      {/* Summary */}
      <Card className="bg-gradient-to-br from-navy-900 to-navy-800 text-white">
        <div className="flex flex-wrap items-center gap-2"><Badge tone="teal">{plan.summary.source === "openai" ? "✨ AI-generated plan" : "Freedom Plan"}</Badge>{plan.createdAt && <span className="text-xs text-navy-300">Saved {new Date(plan.createdAt).toLocaleDateString()}</span>}</div>
        <p className="mt-3 text-2xl font-bold leading-snug">{plan.summary.headline}</p>
        <p className="mt-2 max-w-3xl text-navy-100">{plan.summary.why}</p>
        {editable && (
          <div className="no-print mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm text-navy-200">Payoff method:</span>
            {(["avalanche", "snowball"] as Strategy[]).map(st => (
              <button key={st} onClick={() => regenerate(st)} disabled={pending} className={cx("rounded-full px-3.5 py-1.5 text-sm font-semibold", plan.strategy === st ? "bg-teal-500 text-white" : "bg-white/10 text-white hover:bg-white/20")}>
                {st === "avalanche" ? "Highest interest first" : "Smallest balance first"}
              </button>
            ))}
            <Button variant="secondary" size="sm" onClick={() => regenerate(plan.strategy)} disabled={pending}>{pending ? "Working…" : "↻ Regenerate"}</Button>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>⬇ Download PDF</Button>
          </div>
        )}
        {editable && noExtra && <p className="no-print mt-3 text-sm text-navy-200">ℹ️ Both payoff methods give the same timeline right now because there&apos;s {f(0)} a month spare for extra repayments. Each debt just gets its normal repayment.{debtCount > 1 ? " Once you have spare money, the method decides which debt it goes to first." : ""}</p>}
        {msg && <p className="mt-3 text-sm text-teal-200" role="status">{msg}</p>}
      </Card>

      {/* Scenario cards */}
      <div className="grid gap-4 md:grid-cols-3" role="radiogroup" aria-label="Choose a scenario">
        {plan.scenarios.map(x => {
          const rec = x.key === plan.summary.recommendedScenario;
          return (
            <button key={x.key} role="radio" aria-checked={sel === x.key} onClick={() => setSel(x.key)}
              className={cx("rounded-2xl border-2 bg-white p-5 text-left transition", sel === x.key ? "border-teal-500 shadow-lg shadow-teal-900/10" : "border-navy-100 hover:border-navy-200")}>
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{x.label}</h3>{rec && <Badge tone="teal">Recommended</Badge>}</div>
              <p className="mt-1 text-sm text-navy-600">{SCENARIOS[x.key].blurb}</p>
              <dl className="mt-4 space-y-2 text-sm">
                {hasConsumerDebt && <div className="flex justify-between"><dt className="text-navy-500">Consumer debt-free</dt><dd className="font-bold">{fmtMonths(x.consumerDebtFreeMonth)}</dd></div>}
                {hasMortgage && <div className="flex justify-between"><dt className="text-navy-500">Mortgage-free</dt><dd className="font-bold">{fmtMonths(x.mortgageFreeMonth)}</dd></div>}
                <div className="flex justify-between"><dt className="text-navy-500">Total interest</dt><dd className="font-bold">{f(x.totalInterest)}</dd></div>
                <div className="flex justify-between"><dt className="text-navy-500">Extra to debt / month</dt><dd className="font-bold">{f(x.monthlyToDebt)}</dd></div>
              </dl>
            </button>
          );
        })}
      </div>
      {!s.feasible && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">⚠️ With your current numbers there&apos;s no money left over for extra repayments, so debts take a very long time to clear. Start with Find Help: lenders can often lower repayments or interest through hardship arrangements.</p>}

      <Card as="section">
        <h2 className="mb-3 text-xl font-bold">Debt-free timeline</h2>
        <ScenarioChart scenarios={plan.scenarios} symbol={c.symbol} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card as="section">
          <h2 className="text-xl font-bold">Monthly milestones: {s.label}</h2>
          <ol className="relative mt-4 space-y-3 border-l-2 border-teal-200 pl-5">
            {s.milestones.slice(0, 12).map((ms, i) => (
              <li key={i}><span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-teal-500" aria-hidden />
                <p className="font-semibold">{ms.title.replace(/\((\d+)\)/, (_, n) => `(${f(Number(n))})`)}</p>
                <p className="text-sm text-navy-500">Month {ms.month} · {monthToDate(ms.month)}</p></li>
            ))}
            {!s.milestones.length && <li className="text-navy-500">Milestones appear once there&apos;s money for extra repayments.</li>}
          </ol>
        </Card>
        <Card as="section">
          <h2 className="text-xl font-bold">Debt payoff strategy</h2>
          <p className="mt-1 text-sm text-navy-600">{plan.strategy === "avalanche" ? "Highest interest first: saves the most money." : "Smallest balance first: quick wins to keep you motivated."} Pay minimums on everything and put extra money on the debts in this order, rolling each payment onto the next. Small debts may clear earlier from minimums alone.</p>
          <ol className="mt-4 space-y-2">
            {s.payoffOrder.map((d, i) => <li key={i} className="flex items-center justify-between rounded-xl bg-navy-50 px-4 py-2.5"><span><span className="mr-2 font-bold text-teal-600">{i + 1}.</span>{d.name}</span><span className="text-sm font-semibold">{d.month ? monthToDate(d.month) : "—"}</span></li>)}
          </ol>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-teal-50 p-3"><p className="text-xs text-teal-700">Extra to debt</p><p className="text-lg font-bold">{f(s.monthlyToDebt)}/mo</p></div>
            <div className="rounded-xl bg-navy-50 p-3"><p className="text-xs text-navy-600">To savings</p><p className="text-lg font-bold">{f(s.monthlyToSavings)}/mo</p></div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card as="section">
          <h2 className="text-xl font-bold">Smart tips</h2>
          <ul className="mt-3 space-y-2">{plan.summary.tips.map((t, i) => <li key={i} className="flex gap-2"><span aria-hidden className="text-teal-600">💡</span><span>{t}</span></li>)}</ul>
        </Card>
      </div>

      </>)}

      {/* Goals */}
      <Card as="section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Financial goals tracker</h2>
          {editable && <div className="no-print flex gap-2"><Button variant="ghost" size="sm" onClick={() => setGoals(g => [...g, { id: Math.random().toString(36).slice(2, 9), title: "New goal", target: 1000, current: 0 }])}>+ Add goal</Button><Button size="sm" onClick={saveGoals} disabled={pending}>Save goals</Button></div>}
        </div>
        <div className="mt-4 space-y-4">
          {goals.map((g, i) => {
            const p = g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0;
            return (
              <div key={g.id} className="rounded-xl border border-navy-100 p-4">
                <div className="grid gap-2 sm:grid-cols-[1fr_140px_140px_auto] sm:items-end">
                  <div><label htmlFor={`gt${i}`} className="text-xs">Goal</label><input id={`gt${i}`} disabled={!editable} value={g.title} onChange={e => setGoals(gs => gs.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} className="mt-1" /></div>
                  <div><label htmlFor={`gc${i}`} className="text-xs">Saved / paid so far</label><input id={`gc${i}`} disabled={!editable} inputMode="decimal" value={g.current || ""} onChange={e => setGoals(gs => gs.map((x, j) => j === i ? { ...x, current: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 } : x))} className="mt-1" /></div>
                  <div><label htmlFor={`gg${i}`} className="text-xs">Target</label><input id={`gg${i}`} disabled={!editable} inputMode="decimal" value={g.target || ""} onChange={e => setGoals(gs => gs.map((x, j) => j === i ? { ...x, target: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 } : x))} className="mt-1" /></div>
                  {editable && <button onClick={() => setGoals(gs => gs.filter((_, j) => j !== i))} className="no-print rounded-lg px-2 py-2 text-navy-500 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${g.title}`}>✕</button>}
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-navy-100" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`${g.title} progress`}><div className="h-full rounded-full bg-teal-500" style={{ width: `${p}%` }} /></div>
                <p className="mt-1 text-xs text-navy-500">{p}% · {f(g.current)} of {f(g.target)}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {editable && (
        <Card as="section" className="no-print">
          <h2 className="text-xl font-bold">Ask about your plan</h2>
          <p className="mt-1 text-sm text-navy-600">e.g. &quot;What if I put my tax refund into debt?&quot; · &quot;Should I use my bonus to pay debt or invest?&quot; · &quot;What if I sell my rental property?&quot;</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="ask" className="sr-only">Your question</label>
            <input id="ask" value={q} onChange={e => setQ(e.target.value)} maxLength={600} placeholder="Type a what-if question…" onKeyDown={e => { if (e.key === "Enter" && q.trim()) ask(); }} />
            <Button onClick={ask} disabled={pending || !q.trim()}>{pending ? "Thinking…" : "Ask"}</Button>
          </div>
          {answer && <div className="mt-4 whitespace-pre-wrap rounded-xl bg-navy-50 p-4 text-navy-800" role="status">{answer}</div>}
        </Card>
      )}
    </div>
  );
}
