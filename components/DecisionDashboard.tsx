"use client";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AssessmentInput } from "@/lib/types";
import type { Meters, Scored } from "@/lib/scorecard";
import { calculate } from "@/lib/finance";
import { applyChoices, NO_CHOICES, type Choices } from "@/lib/whatif";
import type { QuickPick } from "@/lib/quickpicks";
import { Badge, Button, Card, cx } from "./ui";

const riskTone = (r: number) => (r >= 70 ? { dot: "🔴", label: "High", cls: "text-red-700" } : r >= 45 ? { dot: "🟡", label: "Medium", cls: "text-amber-700" } : { dot: "🟢", label: "Low", cls: "text-emerald-700" });

function ScoreDial({ value, size = 92 }: { value: number; size?: number }) {
  const r = size / 2 - 7, c = 2 * Math.PI * r, col = value >= 70 ? "#10b981" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} role="img" aria-label={`Score ${value} out of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-navy-900" fontSize={size / 3.4} fontWeight="700">{value}</text>
      <text x="50%" y="70%" textAnchor="middle" className="fill-navy-500" fontSize="10">/100</text>
    </svg>
  );
}

function Meter({ label, now, after, invert, hint }: { label: string; now: number; after: number | null; invert?: boolean; hint: string }) {
  const good = (v: number) => (invert ? v < 45 : v >= 60), bad = (v: number) => (invert ? v >= 70 : v < 40);
  const col = (v: number) => (good(v) ? "bg-emerald-500" : bad(v) ? "bg-red-500" : "bg-amber-500");
  return (
    <div>
      <div className="flex items-baseline justify-between"><p className="font-semibold">{label}</p><p className="text-xs text-navy-500">{hint}</p></div>
      {[["Now", now], ...(after !== null ? [["With this plan", after]] : [])].map(([l, v]) => (
        <div key={l as string} className="mt-1.5 flex items-center gap-2 text-sm">
          <span className="w-24 shrink-0 text-navy-600">{l}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-navy-100" role="meter" aria-valuenow={v as number} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} ${l}`}><div className={cx("h-full rounded-full", col(v as number))} style={{ width: `${v}%` }} /></div>
          <span className="w-10 text-right font-bold">{v}%</span>
        </div>
      ))}
    </div>
  );
}

export default function DecisionDashboard({ base, scenarios, picks, metersNow, metersFor, fmt, onTry, plus, gap }: {
  base: AssessmentInput; scenarios: Scored[]; picks: QuickPick[]; metersNow: Meters; metersFor: (c: Choices) => Meters;
  fmt: (n: number) => string; onTry: (s: Scored) => void; plus: boolean; gap: number;
}) {
  const ranked = [...scenarios].sort((a, b) => b.scores.overall - a.scores.overall);
  const keep = scenarios.find(s => s.key === "keep")!;
  const best = ranked.find(s => s.key !== "keep") ?? keep;
  const mBest = metersFor(best.choices);
  const why: string[] = [];
  if (gap > 0) why.push(best.surplus >= 0 ? `Closes your ${fmt(gap)}/month gap` : `Cuts your monthly gap from ${fmt(gap)} to ${fmt(-best.surplus)}`);
  else if (best.surplus > keep.surplus) why.push(`${fmt(best.surplus - keep.surplus)} more left over each month`);
  if (best.owed10 < keep.owed10) why.push(`${fmt(keep.owed10 - best.owed10)} less owed in 10 years`);
  if (best.risk < keep.risk) why.push(`Financial risk falls from ${keep.risk}% to ${best.risk}%`);
  if (best.scores.ease >= 60) why.push("Relatively easy to do");

  // Waterfall: start with the monthly position, add each move in turn
  let c = NO_CHOICES, prev = Math.round(calculate(base).monthlySurplus);
  const wf: { name: string; range: [number, number]; v: number; kind: "start" | "up" | "down" | "end" }[] = [{ name: "Now", range: [Math.min(0, prev), Math.max(0, prev)], v: prev, kind: "start" }];
  for (const id of best.pickIds) {
    const p = picks.find(x => x.id === id); if (!p) continue;
    c = p.apply(c);
    const next = Math.round(calculate(applyChoices(base, c).input).monthlySurplus);
    wf.push({ name: p.title.length > 22 ? p.title.slice(0, 21) + "…" : p.title, range: [Math.min(prev, next), Math.max(prev, next)], v: next - prev, kind: next >= prev ? "up" : "down" });
    prev = next;
  }
  wf.push({ name: "Result", range: [Math.min(0, prev), Math.max(0, prev)], v: prev, kind: "end" });
  const short = (v: number) => { const a = Math.abs(v); return `${v < 0 ? "−" : ""}${a >= 1000 ? `${(a / 1000).toFixed(1)}k` : Math.round(a)}`; };

  return (
    <div className="space-y-6">
      {/* 1. Best overall outcome */}
      <Card className="border-2 border-teal-400 bg-gradient-to-br from-teal-50 to-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-teal-700">🏆 Best overall outcome · by our scoring</p>
            <h2 className="mt-1 text-2xl font-bold">{best.icon} {best.label.replace(/^(Balanced mix|Bigger changes): /, "")}</h2>
            <ul className="mt-2 space-y-1 text-[15px]">{why.map(w => <li key={w}>✅ {w}</li>)}</ul>
          </div>
          <div className="flex flex-col items-center"><ScoreDial value={best.scores.overall} /><p className="text-xs font-semibold text-navy-500">Overall score</p></div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <table className="w-full text-sm">
            <thead><tr className="text-navy-500"><th className="text-left font-normal">&nbsp;</th><th className="text-right font-normal">Today</th><th className="text-right font-normal">With this plan</th></tr></thead>
            <tbody>
              {[["Each month", fmt(keep.surplus), fmt(best.surplus), best.surplus > keep.surplus],
                ["Owed in 10 years", fmt(keep.owed10), fmt(best.owed10), best.owed10 < keep.owed10],
                ...(plus && best.position10 !== null && keep.position10 !== null ? [["Position in 10 years", fmt(keep.position10), fmt(best.position10), best.position10 > keep.position10]] : []),
                ["Financial risk", `${riskTone(keep.risk).dot} ${riskTone(keep.risk).label}`, `${riskTone(best.risk).dot} ${riskTone(best.risk).label}`, best.risk < keep.risk]].map(([l, a, b, better]) => (
                <tr key={l as string} className="border-t border-navy-100"><td className="py-2 text-navy-600">{l}</td><td className="whitespace-nowrap text-right">{a}</td><td className={cx("whitespace-nowrap text-right font-bold", better ? "text-emerald-700" : "text-navy-900")}>{b}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-2 text-sm">
            {([["Cash flow", best.scores.cashflow], ["Risk reduction", best.scores.risk], ["Wealth", best.scores.wealth], ["Ease", best.scores.ease]] as const).map(([l, v]) => (
              <div key={l} className="flex items-center gap-2"><span className="w-28 text-navy-600">{l}</span><div className="h-2.5 flex-1 overflow-hidden rounded-full bg-navy-100"><div className={cx("h-full rounded-full", v >= 70 ? "bg-emerald-500" : v >= 45 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${v}%` }} /></div><span className="w-8 text-right font-semibold">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => onTry(best)}>Try this plan</Button><Button href="#compare" variant="secondary">Compare alternatives ↓</Button></div>
        <p className="mt-2 text-[11px] text-navy-500">Our scoring: cash flow 40%, risk reduction 30%, wealth 20%, ease 10%. A way to compare options, not advice: you decide.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2. Waterfall */}
        <Card as="section">
          <h3 className="font-bold">How this plan changes your month</h3>
          <p className="text-xs text-navy-500">Start: {fmt(wf[0].v)} a month · each move adds up · result: <strong className={prev >= 0 ? "text-emerald-700" : "text-red-700"}>{fmt(prev)}</strong></p>
          <div className="mt-2 h-64" aria-hidden>
            <ResponsiveContainer>
              <BarChart data={wf} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={50} angle={-15} textAnchor="end" />
                <YAxis tickFormatter={short} tick={{ fontSize: 11 }} width={48} />
                <ReferenceLine y={0} stroke="#0f172a" />
                <Tooltip formatter={(_, __, item) => fmt((item.payload as { v: number }).v)} />
                <Bar dataKey="range" isAnimationActive={false} radius={[4, 4, 4, 4]}>
                  {wf.map((d, k) => <Cell key={k} fill={d.kind === "up" ? "#10b981" : d.kind === "down" ? "#ef4444" : d.v >= 0 ? "#0d6b62" : "#1d3561"} />)}
                  <LabelList dataKey="v" position="top" formatter={(v: unknown) => (Number(v) > 0 ? "+" : "") + short(Number(v))} style={{ fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 3. Risk dashboard */}
        <Card as="section">
          <h3 className="font-bold">Risk dashboard</h3>
          <p className="text-xs text-navy-500">Now vs the best overall outcome</p>
          <div className="mt-3 space-y-4">
            <Meter label="Financial risk" now={metersNow.financialRisk} after={mBest.financialRisk} invert hint="lower is better" />
            <Meter label="Housing security" now={metersNow.housingSecurity} after={mBest.housingSecurity} hint="higher is better" />
            <Meter label="Retirement readiness" now={metersNow.retirementReadiness} after={mBest.retirementReadiness} hint={plus ? "higher is better" : "rough guide"} />
          </div>
        </Card>
      </div>

      {/* 4. Three paths over 10 years */}
      {keep.path && best.path && (() => {
        const aggressive = [...scenarios].filter(s => s.key !== best.key && s.key !== "keep" && s.path).sort((a, b) => (b.path![10] - a.path![10]))[0];
        const data = keep.path.map((v, y) => ({ year: y === 0 ? "Now" : `Yr ${y}`, current: v, recommended: best.path![y], ...(aggressive ? { aggressive: aggressive.path![y] } : {}) }));
        return (
          <Card as="section">
            <h3 className="font-bold">Your financial position over 10 years</h3>
            <p className="text-xs text-navy-500">What you own minus what you owe. Simple view: no growth or inflation assumed.{plus ? " Your retirement picture below adds growth." : ""}</p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              {([["Current path", keep, "#94a3b8"], ["Best overall", best, "#0d9488"], ...(aggressive ? [[aggressive.key === "bigger" ? "Bigger changes" : aggressive.label, aggressive, "#6366f1"]] : [])] as [string, Scored, string][]).map(([l, sc, col]) => (
                <div key={l} className="rounded-xl border border-navy-100 p-3"><p className="flex items-center gap-1.5 text-xs text-navy-500"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: col }} />{l.length > 30 ? l.slice(0, 29) + "…" : l}</p><p className="text-lg font-bold">{fmt(sc.path![10])}</p><p className="text-[11px] text-navy-500">in 10 years</p></div>
              ))}
            </div>
            <div className="mt-3 h-64" aria-hidden>
              <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={short} tick={{ fontSize: 11 }} width={52} />
                  <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="current" name="Current path" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  <Line type="monotone" dataKey="recommended" name="Best overall" stroke="#0d9488" strokeWidth={3} dot={false} />
                  {aggressive && <Line type="monotone" dataKey="aggressive" name="Biggest growth" stroke="#6366f1" strokeWidth={2} dot={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        );
      })()}

      {/* 5. Side-by-side comparison, in plain words */}
      <Card as="section" id="compare" className="scroll-mt-24">
        <h3 className="text-lg font-bold">Compare the options</h3>
        <p className="mt-1 text-sm text-navy-600">Best first. Each score is out of 100: how much of your monthly gap it closes, how much it lowers your risk, what it does to your wealth, and how easy it is.</p>
        <ol className="mt-4 space-y-3">
          {ranked.map((s, k) => {
            const rt = riskTone(s.risk), isKeep = s.key === "keep";
            const scoreWord = s.scores.overall >= 70 ? "Strong" : s.scores.overall >= 45 ? "Fair" : "Weak";
            const month = s.surplus >= 0 ? <>leaves you <strong className="text-emerald-700">{fmt(s.surplus)} spare</strong> each month</> : <>leaves you <strong className="text-red-700">{fmt(-s.surplus)} short</strong> each month</>;
            const vs = !isKeep && keep.surplus < s.surplus ? ` (${fmt(s.surplus - keep.surplus)} better than now)` : "";
            return (
              <li key={s.key} className={cx("rounded-2xl border p-4", s.key === best.key ? "border-2 border-teal-400 bg-teal-50/50" : isKeep ? "border-dashed border-navy-200 bg-navy-50/40" : "border-navy-100")}>
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold"><span className="mr-1 text-navy-400">{k + 1}.</span><span className="mr-1" aria-hidden>{s.icon}</span>{s.label}{s.key === best.key && <Badge tone="teal" className="ml-2">Best</Badge>}</p>
                    <p className="mt-1 text-[15px] text-navy-700">{isKeep ? "If nothing changes, this " : "This "}{month}{vs}.</p>
                    {!isKeep && (() => {
                      const downs: string[] = [];
                      if (s.owed10 > keep.owed10 + 1000) downs.push(`you'd still owe ${fmt(s.owed10 - keep.owed10)} more in 10 years`);
                      if (s.position10 !== null && keep.position10 !== null && s.position10 < keep.position10 - 1000) downs.push(`you'd be ${fmt(keep.position10 - s.position10)} worse off in 10 years`);
                      if (s.risk > keep.risk) downs.push("your financial risk goes up");
                      if (!downs.length) return null;
                      return <p className="mt-1 text-sm text-amber-800">⚠️ Trade-off: {downs.join(", and ")}{s.scores.overall < keep.scores.overall ? ". That's why it scores below keeping things as they are." : "."}</p>;
                    })()}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right"><p className="text-2xl font-bold leading-none">{s.scores.overall}<span className="text-sm font-normal text-navy-500">/100</span></p><p className={cx("text-xs font-semibold", s.scores.overall >= 70 ? "text-emerald-700" : s.scores.overall >= 45 ? "text-amber-700" : "text-red-700")}>{scoreWord}</p></div>
                    {!isKeep && <button type="button" onClick={() => onTry(s)} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">Try this</button>}
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                  <div className="rounded-xl bg-white p-2.5 ring-1 ring-navy-100"><dt className="text-xs text-navy-500">Each month</dt><dd className={cx("font-bold", s.surplus >= 0 ? "text-emerald-700" : "text-red-700")}>{s.surplus >= 0 ? "+" : "−"}{fmt(Math.abs(s.surplus))}</dd></div>
                  <div className="rounded-xl bg-white p-2.5 ring-1 ring-navy-100"><dt className="text-xs text-navy-500">Still owed in 10 years</dt><dd className="font-bold">{fmt(s.owed10)}</dd></div>
                  <div className="rounded-xl bg-white p-2.5 ring-1 ring-navy-100"><dt className="text-xs text-navy-500">Own minus owe, in 10 years</dt><dd className="font-bold">{s.position10 !== null ? fmt(s.position10) : "—"}</dd></div>
                  <div className="rounded-xl bg-white p-2.5 ring-1 ring-navy-100"><dt className="text-xs text-navy-500">Financial risk</dt><dd className={cx("font-bold", rt.cls)}>{rt.dot} {rt.label}</dd></div>
                </dl>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
