"use client";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { AssessmentInput } from "@/lib/types";
import { calculate } from "@/lib/finance";
import { applyChoices, debtTimeline, isEmpty, propertiesOf, NO_CHOICES, type Choices, type DebtChoice, type NewAsset, type PropAction, type PropChoice } from "@/lib/whatif";
import { longView } from "@/lib/projection";
import { libraryLink, LIBRARY_URL } from "@/lib/library";
import { fmtMonths, monthToDate } from "@/lib/plan";
import { COUNTRIES, money, type CountryCode } from "@/lib/countries";
import CashRunway from "./CashRunway";
import RiskAnalysis from "./RiskAnalysis";
import PlatformCompare from "./PlatformCompare";
import { useRouter } from "next/navigation";
import { quickPicks, GROUPS, type Group } from "@/lib/quickpicks";
import { Badge, Button, Card, cx } from "./ui";

const SAVED = "dfiq_whatif_scenarios";
type Saved = { name: string; choices: Choices };
const LABEL: Record<PropAction, string> = { keep: "Keep as is", sell: "Sell", downsize: "Sell & buy smaller", rent_out: "Rent it out", interest_only: "Interest-only", longer_term: "30-year term" };
const uid = () => Math.random().toString(36).slice(2, 9);
const num = (v: string) => (v === "" ? undefined : Number(v));

function Section({ n, title, children, locked }: { n: number; title: string; children: React.ReactNode; locked?: boolean }) {
  return <Card as="section" className={cx(locked && "opacity-60")}><h2 className="text-lg font-bold">{n}. {title}{locked && <Badge tone="navy" className="ml-2">Premium Plus</Badge>}</h2><fieldset disabled={locked} className={cx("mt-3 min-w-0", locked && "select-none")}>{children}</fieldset></Card>;
}

export default function WhatIfLab({ input: base, countryCode, plus }: { input: AssessmentInput; countryCode: CountryCode; plus: boolean }) {
  const c = COUNTRIES[countryCode];
  const f = (v: number) => money(c, v);
  const props = useMemo(() => propertiesOf(base), [base]);
  const others = base.assets.filter(a => ["investments", "business", "other", "vehicle"].includes(a.type) && a.value > 0);
  const retirement = base.assets.find(a => a.type === "retirement" && a.value > 0);
  const debts = base.debts.filter(d => d.balance > 0);
  const router = useRouter();
  const [mode, setMode] = useState<"basic" | "expert">("basic");
  const [group, setGroup] = useState<Group>("property");
  const [picked, setPicked] = useState<string[]>([]);
  const [ch, setCh] = useState<Choices>(NO_CHOICES);
  const [planMsg, setPlanMsg] = useState("");
  const toPlan = async () => {
    setPlanMsg("Building your plan…");
    const r = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strategy: "avalanche", choices: ch }) });
    if (r.ok) router.push("/plan"); else setPlanMsg((await r.json().catch(() => ({}))).error ?? "Couldn't build the plan.");
  };
  const choices = useDeferredValue(ch);
  const [age, setAge] = useState<number | "">(base.age ?? "");
  const [retireAge, setRetireAge] = useState<number | "">(base.retireAge ?? "");
  const [ageMsg, setAgeMsg] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem(SAVED) || "[]")); } catch { /* ignore */ } }, []);
  const persist = (s: Saved[]) => { setSaved(s); try { localStorage.setItem(SAVED, JSON.stringify(s)); } catch { /* ignore */ } };

  const setProp = (id: string, patch: Partial<PropChoice>) => setCh(x => ({ ...x, props: { ...x.props, [id]: { ...(x.props[id] ?? { action: "keep" }), ...patch } } }));
  const setDebt = (id: string, patch: Partial<DebtChoice>) => setCh(x => ({ ...x, debts: { ...x.debts, [id]: { ...(x.debts[id] ?? {}), ...patch } } }));
  const setAdd = (id: string, patch: Partial<NewAsset>) => setCh(x => ({ ...x, add: x.add.map(a => (a.id === id ? { ...a, ...patch } : a)) }));
  const picks = useMemo(() => quickPicks(base, f), [base]); // eslint-disable-line react-hooks/exhaustive-deps
  const togglePick = (id: string) => {
    const next = picked.includes(id) ? picked.filter(x => x !== id) : [...picked.filter(x => !(id.startsWith("ret") && x.startsWith("ret")) && !(id.startsWith("inv") && x.startsWith("inv") && x.split("-")[1] === id.split("-")[1])), id];
    setPicked(next);
    setCh(next.reduce((c, pid) => picks.find(p => p.id === pid)?.apply(c) ?? c, NO_CHOICES));
    const ra = [...next].reverse().map(pid => picks.find(p => p.id === pid)?.retireAge).find(Boolean);
    if (ra) setRetireAge(ra);
  };
  const ages = typeof age === "number" && age >= 16 ? { age, retireAge: typeof retireAge === "number" ? retireAge : undefined } : null;

  const view = (inp: AssessmentInput) => ({ m: calculate(inp), t: debtTimeline(inp), long: plus && ages ? longView(inp, ages, false) : null });
  const before = useMemo(() => view(base), [base, plus, age, retireAge]); // eslint-disable-line react-hooks/exhaustive-deps
  const result = useMemo(() => { const r = applyChoices(base, choices); return { ...r, ...view(r.input) }; }, [base, choices, plus, age, retireAge]); // eslint-disable-line react-hooks/exhaustive-deps
  // Saved scenarios are recalculated only when the list, the numbers or the ages change, not on every keystroke
  const savedViews = useMemo(() => (plus ? saved.map(s => view(applyChoices(base, { ...NO_CHOICES, ...s.choices }).input)) : []), [saved, base, plus, age, retireAge]); // eslint-disable-line react-hooks/exhaustive-deps
  const changed = !isEmpty(ch);
  const B = before.m, A = result.m;

  const runOut = (surplus: number, savings: number) => surplus >= 0 ? "Doesn't run out" : savings <= 0 ? "Already short" : `${(savings / -surplus).toFixed(1)} months`;
  const when = (m: number | null) => m === null ? "Not at this rate" : m === 0 ? "Cleared ✓" : `${monthToDate(m)} (${fmtMonths(m)})`;
  const cmp = (a: number, b: number, higherIsBetter = true) => (a === b ? null : higherIsBetter ? b > a : b < a);
  const cmpMonth = (a: number | null, b: number | null) => (a === b ? null : b === null ? false : a === null ? true : b < a);
  const row = (label: string, a: string, b: string, better: boolean | null = null, hint?: string) => (
    <tr className="border-t border-navy-100"><th scope="row" className="py-2 pr-2 text-left font-normal text-navy-600">{label}{hint && <span className="block text-[11px] text-navy-400">{hint}</span>}</th><td className="text-right align-top">{a}</td><td className={cx("pl-2 text-right align-top font-bold", better === true && "text-emerald-600", better === false && "text-red-600")}>{b}</td></tr>
  );
  const interestSaved = before.t.interest - result.t.interest;

  const saveAges = async () => {
    setAgeMsg("");
    const r = await fetch("/api/assessment/ages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ age, retireAge }) });
    setAgeMsg(r.ok ? "✓ Saved. We won't ask again." : "Couldn't save, but you can still continue.");
  };
  const payTargetsFor = (excludeId?: string) => base.debts.filter(d => d.balance > 0 && d.id !== excludeId);

  return (
    <div className="space-y-6">
      <Card className="border-teal-200 bg-teal-50/60">
        <p className="font-semibold text-teal-900">See the result of every move before you make it. 🧪</p>
        <p className="mt-1 text-sm text-teal-900">Choose what you&apos;d do with your property, debts, savings and investments. We calculate the effect on your cash flow, debts{plus ? ", financial position in 10 years and retirement" : ""}. You decide. Nothing changes in your account. General information, not advice: talk to a financial adviser and an accountant before acting.</p>
        {!plus && <p className="mt-2 text-sm text-teal-900"><strong>Premium:</strong> try one scenario at a time. <a href="/checkout?tier=premium_plus" className="font-semibold underline">Premium Plus</a> adds refinancing, buying assets, lump sums, 10-year and retirement figures, and saving scenarios to compare.</p>}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full bg-navy-50 p-1 text-sm" role="tablist" aria-label="Simulator mode">
              {(["basic", "expert"] as const).map(m => <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={cx("rounded-full px-4 py-1.5 font-semibold", mode === m ? "bg-white shadow" : "text-navy-500")}>{m === "basic" ? "Basic: pick a scenario" : "Expert: fine-tune everything"}</button>)}
            </div>
            {mode === "expert" && picked.length > 0 && <p className="text-xs text-navy-500">Your Basic picks are loaded; change anything below.</p>}
          </div>
          {mode === "basic" ? (
            <Card as="section">
              <h2 className="text-lg font-bold">What would you like to try?</h2>
              <p className="mt-1 text-sm text-navy-600">Tap one or more. The result updates straight away. Tap again to undo.</p>
              <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Kinds of decision">
                {GROUPS.map(g => { const n = picks.filter(p => p.group === g.key).length; return n ? <button key={g.key} type="button" role="tab" aria-selected={group === g.key} onClick={() => setGroup(g.key)} className={cx("rounded-full border px-3 py-1.5 text-sm font-semibold", group === g.key ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white text-navy-700")}>{g.icon} {g.label}{picked.some(id => picks.find(p => p.id === id)?.group === g.key) ? " •" : ""}</button> : null; })}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {picks.filter(p => p.group === group).map(p => {
                  const on = picked.includes(p.id), locked = p.plusOnly && !plus;
                  return (
                    <button key={p.id} type="button" aria-pressed={on} disabled={locked} onClick={() => togglePick(p.id)}
                      className={cx("rounded-2xl border-2 p-4 text-left transition", on ? "border-teal-500 bg-teal-50" : "border-navy-100 bg-white hover:border-teal-300", locked && "cursor-not-allowed opacity-50")}>
                      <span className="flex items-start justify-between gap-2"><span className="text-2xl" aria-hidden>{p.icon}</span>{on ? <Badge tone="teal">✓ Added</Badge> : locked ? <Badge tone="navy">Premium Plus</Badge> : null}</span>
                      <span className="mt-2 block font-bold">{p.title}</span>
                      <span className="mt-1 block text-sm text-navy-600">{p.detail}</span>
                    </button>
                  );
                })}
              </div>
              {picked.length > 0 && <button type="button" onClick={() => { setPicked([]); setCh(NO_CHOICES); }} className="mt-3 text-sm font-semibold text-teal-700">Clear all picks</button>}
            </Card>
          ) : (<>
          <Section n={1} title="Property">
            {!props.length && <p className="text-sm text-navy-500">No property in your Financial Health check.</p>}
            <div className="space-y-4">
              {props.map(p => {
                const choice = ch.props[p.asset.id] ?? { action: "keep" as PropAction };
                const rent = p.rentIncomes.reduce((t, r) => t + r.amount, 0);
                const actions: PropAction[] = ["keep", "sell", ...(p.use !== "rental" ? ["downsize" as const] : []), ...(p.use !== "rental" && !rent ? ["rent_out" as const] : []), ...(p.debt ? ["interest_only" as const, "longer_term" as const] : [])];
                const targets = payTargetsFor(p.debt?.id);
                return (
                  <fieldset key={p.asset.id} className="rounded-xl border border-navy-100 p-4">
                    <legend className="px-1 font-semibold">{p.asset.name} {p.use === "home" ? <Badge tone="teal">🏠 Home</Badge> : p.use === "rental" ? <Badge tone="gray">🔑 Rental</Badge> : null}</legend>
                    <p className="text-sm text-navy-600">Worth {f(p.asset.value)}{p.debt ? ` · owe ${f(p.debt.balance)} at ${p.debt.rate}% · ${f(p.debt.minPayment)}/month` : " · no loan"}{rent ? ` · rent ${f(rent)}/month` : ""}</p>
                    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`What to do with ${p.asset.name}`}>
                      {actions.map(a => (
                        <button key={a} type="button" role="radio" aria-checked={choice.action === a}
                          onClick={() => setProp(p.asset.id, { action: a, price: choice.price ?? p.asset.value, payDownId: choice.payDownId ?? ((a === "sell" || a === "downsize") ? [...targets].sort((x, y) => y.balance - x.balance)[0]?.id : undefined), rent: choice.rent ?? Math.round(p.asset.value * 0.04 / 12 / 10) * 10, newHomePrice: choice.newHomePrice ?? Math.round(p.asset.value * 0.6 / 1000) * 1000 })}
                          className={cx("rounded-full border px-3 py-1.5 text-sm font-semibold", choice.action === a ? "border-teal-500 bg-teal-500 text-white" : "border-navy-200 bg-white text-navy-700 hover:border-teal-400")}>{LABEL[a]}</button>
                      ))}
                    </div>
                    {(choice.action === "sell" || choice.action === "downsize") && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm">Sale price<input type="number" min={0} value={choice.price ?? p.asset.value} onChange={e => setProp(p.asset.id, { price: Number(e.target.value) })} className="mt-1" /></label>
                        {choice.action === "downsize" && <label className="text-sm">Price of the smaller home<input type="number" min={0} value={choice.newHomePrice ?? 0} onChange={e => setProp(p.asset.id, { newHomePrice: Number(e.target.value) })} className="mt-1" /></label>}
                        {targets.length > 0 && <label className="text-sm">Use the money to pay off<select value={choice.payDownId ?? ""} onChange={e => setProp(p.asset.id, { payDownId: e.target.value || undefined })} className="mt-1"><option value="">Nothing: keep it as savings</option>{targets.map(d => <option key={d.id} value={d.id}>{d.name} ({f(d.balance)})</option>)}</select></label>}
                      </div>
                    )}
                    {choice.action === "rent_out" && <label className="mt-3 block text-sm">Rent per month<input type="number" min={0} value={choice.rent ?? 0} onChange={e => setProp(p.asset.id, { rent: Number(e.target.value) })} className="mt-1 sm:max-w-xs" /></label>}
                  </fieldset>
                );
              })}
              {plus && ch.add.filter(a => a.kind === "property").map(a => (
                <fieldset key={a.id} className="rounded-xl border border-teal-200 bg-teal-50/40 p-4">
                  <legend className="px-1 font-semibold">➕ Buy a property</legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-sm">Name<input value={a.name} onChange={e => setAdd(a.id, { name: e.target.value })} className="mt-1" /></label>
                    <label className="text-sm">Price<input type="number" min={0} value={a.amount || ""} onChange={e => setAdd(a.id, { amount: Number(e.target.value) })} className="mt-1" /></label>
                    <label className="text-sm">Deposit from savings<input type="number" min={0} value={a.fromSavings || ""} onChange={e => setAdd(a.id, { fromSavings: Number(e.target.value) })} className="mt-1" /></label>
                    <label className="text-sm">Loan interest %<input type="number" step="0.1" min={0} value={a.loanRate ?? ""} onChange={e => setAdd(a.id, { loanRate: num(e.target.value) })} className="mt-1" /></label>
                    <label className="text-sm">Rent per month<input type="number" min={0} value={a.rent || ""} placeholder="0 if you'll live there" onChange={e => setAdd(a.id, { rent: Number(e.target.value) })} className="mt-1" /></label>
                    <label className="text-sm">Rates, insurance &amp; upkeep / month<input type="number" min={0} value={a.costs || ""} onChange={e => setAdd(a.id, { costs: Number(e.target.value) })} className="mt-1" /></label>
                  </div>
                  <button type="button" onClick={() => setCh(x => ({ ...x, add: x.add.filter(y => y.id !== a.id) }))} className="mt-2 text-sm text-red-600">Remove</button>
                </fieldset>
              ))}
              {plus ? <Button size="sm" variant="secondary" onClick={() => setCh(x => ({ ...x, add: [...x.add, { id: uid(), kind: "property", name: "New property", amount: 0, fromSavings: 0, loanRate: debts.find(d => d.type === "mortgage")?.rate ?? 6 }] }))}>➕ Buy a property</Button>
                : <p className="text-xs text-navy-500">🔒 Buying a property is in Premium Plus.</p>}
            </div>
          </Section>

          <Section n={2} title="Debts: refinance or pay extra" locked={!plus}>
            {!debts.length && <p className="text-sm text-navy-500">No debts in your check.</p>}
            <div className="space-y-3">
              {debts.map(d => {
                const dc = ch.debts[d.id] ?? {};
                return (
                  <div key={d.id} className="rounded-xl border border-navy-100 p-4">
                    <p className="font-semibold">{d.name} <span className="font-normal text-navy-500">· {f(d.balance)} at {d.rate}% · {f(d.minPayment)}/month</span></p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      <label className="text-sm">New interest rate %<input type="number" step="0.05" min={0} value={dc.rate ?? ""} placeholder={String(d.rate)} onChange={e => setDebt(d.id, { rate: num(e.target.value) })} className="mt-1" /></label>
                      <label className="text-sm">Extra per week<input type="number" min={0} value={dc.extraMonthly ? Math.round(dc.extraMonthly / 4.33) : ""} placeholder="0" onChange={e => setDebt(d.id, { extraMonthly: e.target.value ? Number(e.target.value) * 4.33 : undefined })} className="mt-1" /></label>
                      <label className="text-sm">New term (years)<input type="number" min={1} max={40} value={dc.termYears ?? ""} placeholder="same" onChange={e => setDebt(d.id, { termYears: num(e.target.value) })} className="mt-1" /></label>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          <Section n={3} title="Savings, investments & other assets">
            <div className="space-y-4">
              {others.map(a => (
                <label key={a.id} className="block text-sm">
                  <span className="flex justify-between"><span className="font-semibold">{a.name} <span className="font-normal text-navy-500">({f(a.value)})</span></span><span>Sell {ch.sellPct[a.id] ?? 0}%</span></span>
                  <input type="range" min={0} max={100} step={10} value={ch.sellPct[a.id] ?? 0} onChange={e => setCh(x => ({ ...x, sellPct: { ...x.sellPct, [a.id]: Number(e.target.value) } }))} className="mt-1 w-full accent-teal-600" />
                </label>
              ))}
              {retirement && (
                <label className="block text-sm"><span className="font-semibold">{countryCode === "NZ" ? "KiwiSaver hardship withdrawal" : "Withdraw from retirement savings"}</span> <span className="text-navy-500">({retirement.name}: {f(retirement.value)})</span>
                  <input type="number" min={0} max={retirement.value} value={ch.retirementWithdrawal || ""} placeholder="0" onChange={e => setCh(x => ({ ...x, retirementWithdrawal: Number(e.target.value) }))} className="mt-1 sm:max-w-xs" />
                  <span className="mt-1 block text-xs text-navy-500">{countryCode === "NZ" ? "Only allowed for significant financial hardship, with evidence, through your KiwiSaver provider. It lowers your retirement savings." : "Usually restricted, may be taxed or penalised, and lowers your retirement savings."}</span>
                </label>
              )}
              {plus && <label className="block text-sm"><span className="font-semibold">Use cash savings</span> <span className="text-navy-500">(you have {f(base.savings)})</span><input type="number" min={0} max={base.savings} value={ch.savingsToUse || ""} placeholder="0" onChange={e => setCh(x => ({ ...x, savingsToUse: Number(e.target.value) }))} className="mt-1 sm:max-w-xs" /><span className="mt-1 block text-xs text-navy-500">Keep enough for emergencies.</span></label>}
              {(others.length > 0 || retirement || plus) && debts.length > 0 && (
                <label className="block text-sm"><span className="font-semibold">Put this money toward</span>
                  <select value={ch.releaseTo} onChange={e => setCh(x => ({ ...x, releaseTo: e.target.value }))} className="mt-1 sm:max-w-sm"><option value="">Nothing: keep it as savings</option>{[...debts].sort((a, b) => b.rate - a.rate).map(d => <option key={d.id} value={d.id}>{d.name} ({f(d.balance)} at {d.rate}%)</option>)}</select>
                </label>
              )}
              {plus && ch.add.filter(a => a.kind === "investment").map(a => (
                <div key={a.id} className="grid gap-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="text-sm">Invest in<input value={a.name} onChange={e => setAdd(a.id, { name: e.target.value })} className="mt-1" /></label>
                  <label className="text-sm">Amount from savings<input type="number" min={0} value={a.fromSavings || ""} onChange={e => setAdd(a.id, { fromSavings: Number(e.target.value), amount: Number(e.target.value) })} className="mt-1" /></label>
                  <button type="button" onClick={() => setCh(x => ({ ...x, add: x.add.filter(y => y.id !== a.id) }))} className="self-end pb-2 text-sm text-red-600">Remove</button>
                </div>
              ))}
              {plus && <Button size="sm" variant="secondary" onClick={() => setCh(x => ({ ...x, add: [...x.add, { id: uid(), kind: "investment", name: "Index fund", amount: 0, fromSavings: 0 }] }))}>➕ Invest a lump sum</Button>}
            </div>
          </Section>

          <Section n={4} title="Spending">
            <label className="block text-sm">Change in monthly spending (use a minus for a cut, e.g. −500)
              <input type="number" value={ch.spendingChange || ""} placeholder="0" onChange={e => setCh(x => ({ ...x, spendingChange: Number(e.target.value) }))} className="mt-1 sm:max-w-xs" /></label>
          </Section>
                  </>)}
        </div>

        {/* Results */}
        <div id="result" className="scroll-mt-20 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card as="section" aria-live="polite">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">The result</h2>{changed && <button type="button" onClick={() => { setCh(NO_CHOICES); setPicked([]); }} className="text-sm font-semibold text-teal-700">Reset</button>}</div>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-navy-500"><th /><th className="text-right font-normal">Now</th><th className="text-right font-normal">With your choices</th></tr></thead>
              <tbody>
                {row("Each month", f(B.monthlySurplus), f(A.monthlySurplus), cmp(B.monthlySurplus, A.monthlySurplus), `${f(A.monthlyIncome)} in · ${f(A.monthlyExpenses + A.monthlyDebtPayments)} out`)}
                {row("Savings in the bank", f(base.savings), f(result.input.savings), cmp(base.savings, result.input.savings))}
                {row("Cash lasts", runOut(B.monthlySurplus, base.savings), runOut(A.monthlySurplus, result.input.savings))}
                {row("Money you owe", f(B.totalDebts), f(A.totalDebts), cmp(B.totalDebts, A.totalDebts, false))}
                {row("Interest still to pay", f(before.t.interest), f(result.t.interest), cmp(before.t.interest, result.t.interest, false), interestSaved > 0 ? `saves ${f(interestSaved)}` : undefined)}
                {(before.t.consumerFree ?? 1) !== 0 && row("Consumer-debt-free", when(before.t.consumerFree), when(result.t.consumerFree), cmpMonth(before.t.consumerFree, result.t.consumerFree))}
                {(before.t.mortgageFree ?? 1) !== 0 && row("Mortgage-free", when(before.t.mortgageFree), when(result.t.mortgageFree), cmpMonth(before.t.mortgageFree, result.t.mortgageFree))}
                {row("Your financial position", f(B.netWorth), f(A.netWorth), cmp(B.netWorth, A.netWorth))}
                {plus && before.long && result.long && <>
                  {row(`Position at ${before.long.years10.age}`, f(before.long.years10.netWorth), f(result.long.years10.netWorth), cmp(before.long.years10.netWorth, result.long.years10.netWorth), "in 10 years, today's money")}
                  {row(`At retirement (${before.long.retirement.age})`, f(before.long.retirement.netWorth), f(result.long.retirement.netWorth), cmp(before.long.retirement.netWorth, result.long.retirement.netWorth), `cash & investments ${f(result.long.retirement.liquid)}`)}
                  {row("Savings last until", before.long.moneyRunsOutAge ? `age ${before.long.moneyRunsOutAge}` : "90+", result.long.moneyRunsOutAge ? `age ${result.long.moneyRunsOutAge}` : "90+", (before.long.moneyRunsOutAge ?? 999) === (result.long.moneyRunsOutAge ?? 999) ? null : (result.long.moneyRunsOutAge ?? 999) > (before.long.moneyRunsOutAge ?? 999), `before ${countryCode === "NZ" ? "NZ Super" : "state pension"}`)}
                </>}
                {row("Financial Health score", `${B.healthScore}/100`, `${A.healthScore}/100`, cmp(B.healthScore, A.healthScore))}
              </tbody>
            </table>
            {Object.keys(result.t.perDebt).length > 0 && changed && (
              <details open className="mt-3 text-xs text-navy-600"><summary className="cursor-pointer font-semibold">When each debt is paid off</summary>
                <ul className="mt-1 space-y-0.5">{Object.entries(result.t.perDebt).map(([id, d]) => <li key={id}>{d.name}: {when(d.month)}{before.t.perDebt[id] && before.t.perDebt[id].month !== d.month ? ` (was ${when(before.t.perDebt[id].month)})` : ""}</li>)}</ul></details>
            )}
            {result.notes.length > 0 && <ul className="mt-3 space-y-1 border-t border-navy-100 pt-3 text-xs text-navy-600">{result.notes.map((n, k) => <li key={k}>• {n.replace(/\b(\d{3,})\b(?![%.-]|-year)/g, m => f(Number(m)))}</li>)}</ul>}
            {result.notes.some(n => /sold/.test(n)) && <p className="mt-2 text-xs text-amber-800">Selling costs are estimated at 3%. Tax may apply (e.g. NZ bright-line rules); check with an accountant.</p>}
            <p className="mt-2 text-[11px] text-navy-400">Each debt is repaid at its own repayment; interest counted up to 50 years.{plus ? " Long-term figures assume 6% investment growth, 3% property growth and 2.5% inflation." : ""}</p>
            {changed && (plus ? (saved.length < 3 && <Button size="sm" variant="secondary" className="mt-3" onClick={() => { const name = prompt("Name this scenario", `Scenario ${String.fromCharCode(65 + saved.length)}`); if (name) persist([...saved, { name: name.slice(0, 40), choices: ch }]); }}>💾 Save to compare</Button>)
              : <p className="mt-3 rounded-xl bg-navy-50 p-3 text-xs text-navy-700">Want to save this and compare it with other choices? <a className="font-semibold text-teal-700" href="/checkout?tier=premium_plus">Upgrade to Premium Plus</a></p>)}
          </Card>

          {changed && <Card className="border-teal-300 bg-teal-50"><p className="font-semibold text-teal-900">Happy with these choices?</p><p className="mt-1 text-sm text-teal-900">Turn them into a dated, step-by-step Freedom Plan you can tick off.</p><Button className="mt-3" full onClick={toPlan}>Use these choices in my Freedom Plan →</Button>{planMsg && <p className="mt-2 text-xs text-teal-800">{planMsg}</p>}</Card>}

          <Card as="section">
            <h2 className="text-lg font-bold">Your retirement picture</h2>
            {!plus ? <p className="mt-1 text-sm text-navy-600">🔒 Premium Plus shows your net worth in 10 years and at retirement for every scenario, and opens the full picture in the Investment Research Library.</p> : (<>
              {!base.age && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-sm">Your age<input type="number" min={16} max={100} value={age} onChange={e => setAge(e.target.value ? Number(e.target.value) : "")} className="mt-1" /></label>
                  <label className="text-sm">Retire at<input type="number" min={40} max={90} value={retireAge} placeholder="65" onChange={e => setRetireAge(e.target.value ? Number(e.target.value) : "")} className="mt-1" /></label>
                  {ages && <Button size="sm" variant="secondary" className="col-span-2" onClick={saveAges}>Remember my age</Button>}
                  {ageMsg && <p className="col-span-2 text-xs text-teal-700">{ageMsg}</p>}
                </div>
              )}
              {base.age && <p className="mt-1 text-xs text-navy-500">Age {base.age}, retiring at {base.retireAge ?? 65} (from your Financial Health check).</p>}
              <p className="mt-2 text-xs text-navy-500">Figures don&apos;t include {countryCode === "NZ" ? "NZ Super" : "the state pension"} yet. Add it in the Library for the full picture.</p>
              {!LIBRARY_URL ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Set NEXT_PUBLIC_LIBRARY_URL to your Investment Research Library address to turn on the full picture.</p> : ages ? (
                <div className="mt-3 flex flex-col gap-2">
                  <Button href={libraryLink(result.input, ages)!} target="_blank" rel="noopener" full>{changed ? "Full retirement picture with my choices ↗" : "See my full retirement picture ↗"}</Button>
                  {changed && <Button href={libraryLink(base, ages)!} target="_blank" rel="noopener" variant="secondary" full size="sm">Compare: if I change nothing ↗</Button>}
                </div>
              ) : <p className="mt-3 text-xs text-navy-500">Enter your age to see it.</p>}
            </>)}
          </Card>
        </div>
      </div>

      {plus && ages ? <RiskAnalysis before={base} after={result.input} changed={changed} ages={ages} />
        : <Card as="section" className="opacity-80"><h2 className="text-lg font-bold">Strengths, weaknesses &amp; risks</h2><p className="mt-1 text-sm text-navy-600">{plus ? "Enter your age (in “Your retirement picture”) to see the analysis." : "🔒 Premium Plus analyses your finances now and with your choices: what's strong, what's weak, and the risks (interest rates, markets, property concentration, how long savings last)."}</p></Card>}
      {plus ? <PlatformCompare startBalance={result.input.assets.filter(a => a.type === "investments" || a.type === "retirement").reduce((t, a) => t + a.value, 0) || 10000} monthly={Math.max(0, A.monthlySurplus)} years={ages ? Math.max(5, (ages.retireAge ?? 65) - ages.age) : 20} countryCode={countryCode} fmt={f} />
        : <Card as="section" className="opacity-80"><h2 className="text-lg font-bold">Investment platform comparison</h2><p className="mt-1 text-sm text-navy-600">🔒 Premium Plus compares what different platforms&apos; and funds&apos; fees do to your investments over time.</p></Card>}

      {changed && <CashRunway income={A.monthlyIncome} living={A.monthlyExpenses} debt={A.monthlyDebtPayments} savings={result.input.savings} symbol={c.symbol} fmt={f} />}

      {plus && saved.length > 0 && (
        <Card as="section">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Compare your scenarios</h2><button type="button" className="text-sm text-red-600" onClick={() => persist([])}>Clear</button></div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead><tr className="text-navy-500"><th /><th className="text-right font-normal">Now</th>{saved.map(s => <th key={s.name} className="text-right font-semibold text-navy-800"><button type="button" onClick={() => setCh({ ...NO_CHOICES, ...s.choices })} className="hover:text-teal-700" title="Load this scenario">{s.name}</button></th>)}</tr></thead>
              <tbody>
                {(() => {
                  const cols = [before, ...savedViews];
                  const rows: [string, (v: typeof before) => string][] = [
                    ["Each month", v => f(v.m.monthlySurplus)], ["Money you owe", v => f(v.m.totalDebts)], ["Interest still to pay", v => f(v.t.interest)],
                    ["Mortgage-free", v => when(v.t.mortgageFree)], ["Your financial position", v => f(v.m.netWorth)],
                    ...(ages ? [["Position in 10 years", (v: typeof before) => (v.long ? f(v.long.years10.netWorth) : "—")], ["At retirement", (v: typeof before) => (v.long ? f(v.long.retirement.netWorth) : "—")]] as [string, (v: typeof before) => string][] : []),
                  ];
                  return rows.map(([l, get]) => <tr key={l} className="border-t border-navy-100"><th scope="row" className="py-2 text-left font-normal text-navy-600">{l}</th>{cols.map((v, k) => <td key={k} className={cx("text-right", k > 0 && "font-semibold")}>{get(v)}</td>)}</tr>);
                })()}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-navy-500">Saved in this browser. Click a scenario name to load it.</p>
        </Card>
      )}
      {changed && (
        <a href="#result" className="no-print fixed inset-x-3 bottom-[4.5rem] z-40 flex items-center justify-between gap-3 rounded-2xl bg-navy-900 px-4 py-3 text-white shadow-xl lg:hidden">
          <span className="text-sm">Each month: <strong className={A.monthlySurplus >= B.monthlySurplus ? "text-teal-300" : "text-red-300"}>{f(A.monthlySurplus)}</strong> <span className="text-navy-300">(now {f(B.monthlySurplus)})</span></span>
          <span className="text-sm font-semibold text-teal-300">See result ↓</span>
        </a>
      )}
    </div>
  );
}
