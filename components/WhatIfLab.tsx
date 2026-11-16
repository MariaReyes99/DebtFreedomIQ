"use client";
import { useEffect, useMemo, useState } from "react";
import type { AssessmentInput } from "@/lib/types";
import { calculate } from "@/lib/finance";
import { applyChoices, propertiesOf, NO_CHOICES, type Choices, type PropAction, type PropChoice } from "@/lib/whatif";
import { libraryLink, LIBRARY_URL } from "@/lib/library";
import { COUNTRIES, money, type CountryCode } from "@/lib/countries";
import CashRunway from "./CashRunway";
import { Badge, Button, Card, cx } from "./ui";

const SAVED = "dfiq_whatif_scenarios";
type Saved = { name: string; choices: Choices };

const LABEL: Record<PropAction, string> = { keep: "Keep as is", sell: "Sell", downsize: "Sell & buy smaller", rent_out: "Rent it out", interest_only: "Interest-only", longer_term: "30-year term" };

export default function WhatIfLab({ input: base, countryCode }: { input: AssessmentInput; countryCode: CountryCode }) {
  const c = COUNTRIES[countryCode];
  const f = (v: number) => money(c, v);
  const props = useMemo(() => propertiesOf(base), [base]);
  const others = base.assets.filter(a => ["investments", "business", "other", "vehicle"].includes(a.type) && a.value > 0);
  const retirement = base.assets.find(a => a.type === "retirement" && a.value > 0);
  const [ch, setCh] = useState<Choices>(NO_CHOICES);
  const [age, setAge] = useState<number | "">(base.age ?? "");
  const [retireAge, setRetireAge] = useState<number | "">(base.retireAge ?? "");
  const [ageMsg, setAgeMsg] = useState("");
  const [saved, setSaved] = useState<Saved[]>([]);
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem(SAVED) || "[]")); } catch { /* ignore */ } }, []);
  const persist = (s: Saved[]) => { setSaved(s); try { localStorage.setItem(SAVED, JSON.stringify(s)); } catch { /* ignore */ } };

  const setProp = (id: string, patch: Partial<PropChoice>) => setCh(x => ({ ...x, props: { ...x.props, [id]: { ...(x.props[id] ?? { action: "keep" }), ...patch } } }));
  const before = useMemo(() => ({ input: base, m: calculate(base) }), [base]);
  const result = useMemo(() => { const r = applyChoices(base, ch); return { ...r, m: calculate(r.input) }; }, [base, ch]);
  const changed = JSON.stringify(ch) !== JSON.stringify(NO_CHOICES);

  const runOut = (surplus: number, savings: number) => surplus >= 0 ? "Doesn't run out" : savings <= 0 ? "Already short" : `${(savings / -surplus).toFixed(1)} months`;
  const row = (label: string, a: string, b: string, better?: boolean | null) => (
    <tr className="border-t border-navy-100"><th scope="row" className="py-2 text-left font-normal text-navy-600">{label}</th><td className="text-right">{a}</td><td className={cx("text-right font-bold", better === true && "text-emerald-600", better === false && "text-red-600")}>{b}</td></tr>
  );
  const B = before.m, A = result.m;
  const ages = typeof age === "number" ? { age, retireAge: typeof retireAge === "number" ? retireAge : undefined } : null;

  const saveAges = async () => {
    setAgeMsg("");
    const r = await fetch("/api/assessment/ages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ age, retireAge }) });
    setAgeMsg(r.ok ? "✓ Saved. We won't ask again." : "Couldn't save, but you can still continue.");
  };

  return (
    <div className="space-y-6">
      <Card className="border-teal-200 bg-teal-50/60">
        <p className="font-semibold text-teal-900">You choose, we calculate. 🧪</p>
        <p className="mt-1 text-sm text-teal-900">Try different choices for your property and savings and see what happens to your monthly cash flow, your debts and your retirement. Nothing changes in your account until you decide. This is general information, not advice: talk to a financial adviser and an accountant before acting.</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          {/* Properties */}
          <Card as="section">
            <h2 className="text-lg font-bold">1. Your property</h2>
            {!props.length && <p className="mt-2 text-sm text-navy-500">No property in your Financial Health check.</p>}
            <div className="mt-3 space-y-4">
              {props.map(p => {
                const choice = ch.props[p.asset.id] ?? { action: "keep" as PropAction };
                const rent = p.rentIncomes.reduce((t, r) => t + r.amount, 0);
                const actions: PropAction[] = ["keep", "sell", ...(p.use !== "rental" ? ["downsize" as const] : []), ...(p.use !== "rental" && !rent ? ["rent_out" as const] : []), ...(p.debt ? ["interest_only" as const, "longer_term" as const] : [])];
                const payTargets = base.debts.filter(d => d.balance > 0 && d.id !== p.debt?.id);
                return (
                  <fieldset key={p.asset.id} className="rounded-xl border border-navy-100 p-4">
                    <legend className="px-1 font-semibold">{p.asset.name} {p.use === "home" ? <Badge tone="teal">🏠 Home</Badge> : p.use === "rental" ? <Badge tone="gray">🔑 Rental</Badge> : null}</legend>
                    <p className="text-sm text-navy-600">Worth {f(p.asset.value)}{p.debt ? ` · owe ${f(p.debt.balance)} at ${p.debt.rate}% · ${f(p.debt.minPayment)}/month` : " · no loan"}{rent ? ` · rent ${f(rent)}/month` : ""}</p>
                    <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label={`What to do with ${p.asset.name}`}>
                      {actions.map(a => (
                        <button key={a} type="button" role="radio" aria-checked={choice.action === a} onClick={() => setProp(p.asset.id, { action: a, price: choice.price ?? p.asset.value, payDownId: choice.payDownId ?? (a === "sell" ? payTargets.sort((x, y) => y.balance - x.balance)[0]?.id : undefined), rent: choice.rent ?? Math.round(p.asset.value * 0.04 / 12 / 10) * 10, newHomePrice: choice.newHomePrice ?? Math.round(p.asset.value * 0.6 / 1000) * 1000 })}
                          className={cx("rounded-full border px-3 py-1.5 text-sm font-semibold", choice.action === a ? "border-teal-500 bg-teal-500 text-white" : "border-navy-200 bg-white text-navy-700 hover:border-teal-400")}>{LABEL[a]}</button>
                      ))}
                    </div>
                    {(choice.action === "sell" || choice.action === "downsize") && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <label className="text-sm">Sale price<input type="number" min={0} value={choice.price ?? p.asset.value} onChange={e => setProp(p.asset.id, { price: Number(e.target.value) })} className="mt-1" /></label>
                        {choice.action === "downsize" && <label className="text-sm">Price of the smaller home<input type="number" min={0} value={choice.newHomePrice ?? ""} placeholder={String(Math.round(p.asset.value * 0.6))} onChange={e => setProp(p.asset.id, { newHomePrice: Number(e.target.value) })} className="mt-1" /></label>}
                        {payTargets.length > 0 && <label className="text-sm">Use the money to pay off<select value={choice.payDownId ?? ""} onChange={e => setProp(p.asset.id, { payDownId: e.target.value || undefined })} className="mt-1"><option value="">Nothing: keep it as savings</option>{payTargets.map(d => <option key={d.id} value={d.id}>{d.name} ({f(d.balance)})</option>)}</select></label>}
                      </div>
                    )}
                    {choice.action === "rent_out" && <label className="mt-3 block text-sm">Rent per month<input type="number" min={0} value={choice.rent ?? 0} onChange={e => setProp(p.asset.id, { rent: Number(e.target.value) })} className="mt-1 sm:max-w-xs" /></label>}
                  </fieldset>
                );
              })}
            </div>
          </Card>

          {/* Investments and savings */}
          <Card as="section">
            <h2 className="text-lg font-bold">2. Investments, savings & other assets</h2>
            <div className="mt-3 space-y-4">
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
              {!others.length && !retirement && <p className="text-sm text-navy-500">No investments or other assets in your check.</p>}
            </div>
          </Card>

          <Card as="section">
            <h2 className="text-lg font-bold">3. Spending</h2>
            <label className="mt-2 block text-sm">Change in monthly spending (use a minus for a cut, e.g. −500)
              <input type="number" value={ch.spendingChange || ""} placeholder="0" onChange={e => setCh(x => ({ ...x, spendingChange: Number(e.target.value) }))} className="mt-1 sm:max-w-xs" /></label>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card as="section" aria-live="polite">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">The effect</h2>{changed && <button type="button" onClick={() => setCh(NO_CHOICES)} className="text-sm font-semibold text-teal-700">Reset</button>}</div>
            <table className="mt-2 w-full text-sm">
              <thead><tr className="text-navy-500"><th /><th className="text-right font-normal">Now</th><th className="text-right font-normal">With your choices</th></tr></thead>
              <tbody>
                {row("Money in / month", f(B.monthlyIncome), f(A.monthlyIncome), A.monthlyIncome === B.monthlyIncome ? null : A.monthlyIncome > B.monthlyIncome)}
                {row("Money out / month", f(B.monthlyExpenses + B.monthlyDebtPayments), f(A.monthlyExpenses + A.monthlyDebtPayments), (A.monthlyExpenses + A.monthlyDebtPayments) === (B.monthlyExpenses + B.monthlyDebtPayments) ? null : (A.monthlyExpenses + A.monthlyDebtPayments) < (B.monthlyExpenses + B.monthlyDebtPayments))}
                {row("Each month", f(B.monthlySurplus), f(A.monthlySurplus), A.monthlySurplus === B.monthlySurplus ? null : A.monthlySurplus > B.monthlySurplus)}
                {row("Cash savings", f(base.savings), f(result.input.savings), result.input.savings === base.savings ? null : result.input.savings > base.savings)}
                {row("Cash lasts", runOut(B.monthlySurplus, base.savings), runOut(A.monthlySurplus, result.input.savings))}
                {row("Total debt", f(B.totalDebts), f(A.totalDebts), A.totalDebts === B.totalDebts ? null : A.totalDebts < B.totalDebts)}
                {row("Net worth", f(B.netWorth), f(A.netWorth), A.netWorth === B.netWorth ? null : A.netWorth > B.netWorth)}
                {row("Health score", `${B.healthScore}/100`, `${A.healthScore}/100`, A.healthScore === B.healthScore ? null : A.healthScore > B.healthScore)}
              </tbody>
            </table>
            {result.notes.length > 0 && <ul className="mt-3 space-y-1 border-t border-navy-100 pt-3 text-xs text-navy-600">{result.notes.map((n, k) => <li key={k}>• {n.replace(/\b(\d{4,})\b/g, m => f(Number(m)))}</li>)}</ul>}
            {result.notes.some(n => /sold/.test(n)) && <p className="mt-2 text-xs text-amber-800">Selling costs are estimated at 3%. Tax may apply (e.g. NZ bright-line rules); check with an accountant.</p>}
            {changed && saved.length < 3 && <Button size="sm" variant="secondary" className="mt-3" onClick={() => { const name = prompt("Name this scenario", `Scenario ${saved.length + 1}`); if (name) persist([...saved, { name: name.slice(0, 40), choices: ch }]); }}>💾 Save to compare</Button>}
          </Card>

          {/* Retirement */}
          <Card as="section">
            <h2 className="text-lg font-bold">Your retirement picture</h2>
            <p className="mt-1 text-sm text-navy-600">Opens your numbers in the Investment Research Library&apos;s wealth projector: savings at 55–70, the chance your money lasts, and pensions. Your numbers are passed in the link and stay in your browser.</p>
            {!ages || !base.age ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="text-sm">Your age<input type="number" min={16} max={100} value={age} onChange={e => setAge(e.target.value ? Number(e.target.value) : "")} className="mt-1" /></label>
                <label className="text-sm">Retire at<input type="number" min={40} max={90} value={retireAge} placeholder="65" onChange={e => setRetireAge(e.target.value ? Number(e.target.value) : "")} className="mt-1" /></label>
                {typeof age === "number" && <Button size="sm" variant="secondary" className="col-span-2" onClick={saveAges}>Remember my age</Button>}
                {ageMsg && <p className="col-span-2 text-xs text-teal-700">{ageMsg}</p>}
              </div>
            ) : <p className="mt-2 text-xs text-navy-500">Age {base.age}, retiring at {base.retireAge ?? "65"} (from your Financial Health check).</p>}
            {!LIBRARY_URL ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Set NEXT_PUBLIC_LIBRARY_URL to your Investment Research Library address to turn this on.</p> : ages ? (
              <div className="mt-3 flex flex-col gap-2">
                <Button href={libraryLink(result.input, ages)!} target="_blank" rel="noopener" full>{changed ? "See retirement with my choices ↗" : "See my retirement picture ↗"}</Button>
                {changed && <Button href={libraryLink(base, ages)!} target="_blank" rel="noopener" variant="secondary" full size="sm">Compare: retirement if I change nothing ↗</Button>}
              </div>
            ) : <p className="mt-3 text-xs text-navy-500">Enter your age to see it.</p>}
          </Card>
        </div>
      </div>

      {changed && <CashRunway income={A.monthlyIncome} living={A.monthlyExpenses} debt={A.monthlyDebtPayments} savings={result.input.savings} symbol={c.symbol} fmt={f} />}

      {saved.length > 0 && (
        <Card as="section">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Compare your scenarios</h2><button type="button" className="text-sm text-red-600" onClick={() => persist([])}>Clear</button></div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-navy-500"><th /><th className="text-right font-normal">Now</th>{saved.map(s => <th key={s.name} className="text-right font-semibold text-navy-800"><button type="button" onClick={() => setCh(s.choices)} className="hover:text-teal-700" title="Load this scenario">{s.name}</button></th>)}</tr></thead>
              <tbody>
                {([["Each month", (m: ReturnType<typeof calculate>) => f(m.monthlySurplus)], ["Total debt", (m: ReturnType<typeof calculate>) => f(m.totalDebts)], ["Net worth", (m: ReturnType<typeof calculate>) => f(m.netWorth)], ["Health score", (m: ReturnType<typeof calculate>) => `${m.healthScore}/100`]] as const).map(([l, get]) => (
                  <tr key={l} className="border-t border-navy-100"><th scope="row" className="py-2 text-left font-normal text-navy-600">{l}</th><td className="text-right">{get(B)}</td>{saved.map(s => <td key={s.name} className="text-right font-semibold">{get(calculate(applyChoices(base, s.choices).input))}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-navy-500">Saved in this browser. Click a scenario name to load it.</p>
        </Card>
      )}
    </div>
  );
}
