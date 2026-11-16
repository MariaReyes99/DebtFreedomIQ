"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Advice, AssessmentInput, DebtType, AssetType, HelpCategory, Metrics } from "@/lib/types";
import { COUNTRIES, money as fmtMoney, type CountryCode } from "@/lib/countries";
import { calculate, dataWarnings } from "@/lib/finance";
import { exampleFor, EMPTY_HOUSEHOLD } from "@/lib/mock-data";
import { setCountry } from "@/app/actions";
import CountrySearch from "./CountrySearch";
import HealthResults from "./HealthResults";
import { Button, Card, cx } from "./ui";

type Result = { metrics: Metrics; advice: Advice; help: { category: HelpCategory; why: string }[]; saved: boolean };
const PENDING = "dfiq_pending_assessment";
const STEPS = ["Income", "Expenses", "Debts", "Assets & savings", "Your situation"] as const;
const DEBT_TYPES: [DebtType, string][] = [["mortgage", "Mortgage / home loan"], ["credit_card", "Credit card"], ["personal_loan", "Personal loan"], ["car_loan", "Car loan"], ["bnpl", "Buy now pay later"], ["student_loan", "Student loan"], ["medical", "Medical / hospital bill"], ["tax", "Tax debt"], ["business", "Business debt"], ["family", "Family / friends"], ["other", "Other"]];
const ASSET_TYPES: [AssetType, string][] = [["property", "Property"], ["vehicle", "Vehicle"], ["investments", "Investments / shares"], ["retirement", "Retirement / KiwiSaver / super"], ["business", "Business"], ["other", "Other"]];
const SITUATION: [keyof AssessmentInput["situation"], string][] = [
  ["behindOnBills", "I'm behind on bills or loan repayments"],
  ["collectionsOrCourt", "I'm getting debt collector calls or court notices"],
  ["cantAffordFood", "I'm struggling to afford food"],
  ["housingAtRisk", "I'm worried about losing my home (arrears, eviction, mortgagee sale)"],
  ["medicalDebt", "Some of my debt is from health, doctor or hospital costs"],
  ["distressed", "Money worries are seriously affecting my wellbeing"],
];
const uid = () => Math.random().toString(36).slice(2, 9);
const num = (v: string) => Math.max(0, Number(v.replace(/[^\d.]/g, "")) || 0);

export default function HealthWizard({ countryCode, detected, loggedIn, isPremium, initial }: {
  countryCode: CountryCode | null; detected: string | null; loggedIn: boolean; isPremium: boolean; initial?: AssessmentInput | null;
}) {
  const [code, setCode] = useState<CountryCode | null>(countryCode);
  const [data, setData] = useState<AssessmentInput>(() => initial ?? EMPTY_HOUSEHOLD(countryCode ?? "NZ"));
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<(Result & { input: AssessmentInput }) | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const c = code ? COUNTRIES[code] : null;
  const sym = c?.symbol ?? "$";

  const submit = (input: AssessmentInput) => start(async () => {
    setError("");
    const res = await fetch("/api/assessment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const json = await res.json();
    if (!res.ok) { setError(json.error || "Something went wrong. Please try again."); return; }
    if (!loggedIn) { try { localStorage.setItem(PENDING, JSON.stringify(input)); } catch { /* ignore */ } }
    setResult({ ...json, input });
    requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  });

  // After sign-up/login, save the check the person did before creating an account.
  useEffect(() => {
    if (!loggedIn) return;
    try {
      const raw = localStorage.getItem(PENDING);
      if (raw) { localStorage.removeItem(PENDING); const input = JSON.parse(raw) as AssessmentInput; setData(input); submit(input); }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  const warnings = useMemo(() => (c ? dataWarnings(data, calculate(data), v => fmtMoney(c, v)) : []), [data, c]);
  const totals = useMemo(() => ({
    income: data.incomes.reduce((s, x) => s + x.amount, 0),
    expenses: data.expenses.reduce((s, x) => s + x.amount, 0),
    debts: data.debts.reduce((s, x) => s + x.balance, 0),
    assets: data.assets.reduce((s, x) => s + x.value, 0) + data.savings,
  }), [data]);

  const upd = <K extends "incomes" | "expenses" | "debts" | "assets">(k: K, i: number, patch: Partial<AssessmentInput[K][number]>) =>
    setData(d => ({ ...d, [k]: (d[k] as AssessmentInput[K][number][]).map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const remove = (k: "incomes" | "expenses" | "debts" | "assets", i: number) => setData(d => ({ ...d, [k]: (d[k] as unknown[]).filter((_, j) => j !== i) }));

  if (result && c) return (
    <div>
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => { setResult(null); setStep(0); }}>← Edit my answers</Button>
      </div>
      <HealthResults input={result.input} metrics={result.metrics} advice={result.advice} help={result.help} countryCode={c.code} loggedIn={loggedIn} saved={result.saved} isPremium={isPremium} />
    </div>
  );

  const row = "grid gap-2 rounded-xl border border-navy-100 bg-navy-50/50 p-3 sm:items-end";
  const del = (k: "incomes" | "expenses" | "debts" | "assets", i: number, label: string) => (
    <button type="button" onClick={() => remove(k, i)} className="rounded-lg px-2 py-2 text-sm text-navy-500 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${label}`}>✕</button>
  );
  const money = (label: string, value: number, on: (v: number) => void, id: string) => (
    <div><label htmlFor={id} className="text-xs">{label}</label>
      <div className="relative mt-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-navy-400">{sym}</span>
        <input id={id} inputMode="decimal" value={value || ""} placeholder="0" onChange={e => on(num(e.target.value))} className="!pl-9" /></div></div>
  );

  return (
    <Card className="p-0">
      {!c ? (
        <div className="p-6">
          <h2 className="text-xl font-bold">Where do you live?</h2>
          <p className="mb-4 mt-1 text-sm text-navy-600">{detected ? `You appear to be in ${detected}, which we don't cover yet. Choose the closest country.` : "We'll use this for your currency and local help. You only do this once."}</p>
          <CountrySearch label="Country" onSelect={cc => { setCode(cc); setData(d => ({ ...d, country: cc })); start(() => setCountry(cc)); }} />
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="border-b border-navy-100 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-navy-600">📍 Amounts in <strong>{c.currency.toUpperCase()}</strong> per <strong>month</strong> for {c.name}</p>
              <button type="button" onClick={() => { setData(exampleFor(c.code)); setStep(4); }} className="text-sm font-semibold text-teal-700 hover:underline">Try with example data</button>
            </div>
            <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Progress">
              {STEPS.map((s, i) => (
                <li key={s}>
                  <button type="button" onClick={() => setStep(i)} aria-current={i === step ? "step" : undefined} className="w-full text-left">
                    <span className={cx("block h-1.5 rounded-full", i <= step ? "bg-teal-500" : "bg-navy-100")} />
                    <span className={cx("mt-1.5 hidden text-xs font-semibold sm:block", i === step ? "text-teal-700" : "text-navy-500")}>{i + 1}. {s}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>

          <form className="space-y-4 p-4 sm:p-6" onSubmit={e => { e.preventDefault(); if (step < STEPS.length - 1) setStep(step + 1); else submit({ ...data, country: c.code }); }}>
            <h2 className="text-xl font-bold">{step + 1}. {STEPS[step]}</h2>

            {step === 0 && (<>
              <p className="text-sm text-navy-600">Take-home pay after tax, plus benefits, child support, rental income and anything else. Paid fortnightly? Multiply by 2.17. Weekly? Multiply by 4.33.</p>
              {data.incomes.map((x, i) => (
                <div key={x.id} className={cx(row, "sm:grid-cols-[1fr_180px_auto]")}>
                  <div><label htmlFor={`is${i}`} className="text-xs">Source</label><input id={`is${i}`} value={x.source} onChange={e => upd("incomes", i, { source: e.target.value })} className="mt-1" /></div>
                  {money("Per month", x.amount, v => upd("incomes", i, { amount: v }), `ia${i}`)}
                  {del("incomes", i, x.source)}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {["Rental income", "Partner's pay", "Benefits / tax credits", "Child support", "Other income"].map(src => (
                  <Button key={src} variant="secondary" size="sm" onClick={() => setData(d => ({ ...d, incomes: [...d.incomes, { id: uid(), source: src, amount: 0 }] }))}>+ {src}</Button>
                ))}
              </div>
            </>)}

            {step === 1 && (<>
              <p className="text-sm text-navy-600">Monthly living costs. Don&apos;t include debt repayments here (they go in the next step). Tick &quot;Essential&quot; for things you can&apos;t cut.</p>
              {data.expenses.map((x, i) => (
                <div key={x.id} className={cx(row, "sm:grid-cols-[1fr_180px_auto_auto]")}>
                  <div><label htmlFor={`ec${i}`} className="text-xs">Category</label><input id={`ec${i}`} value={x.category} onChange={e => upd("expenses", i, { category: e.target.value })} className="mt-1" /></div>
                  {money("Per month", x.amount, v => upd("expenses", i, { amount: v }), `ea${i}`)}
                  <label className="flex items-center gap-2 pb-2.5 text-sm font-medium"><input type="checkbox" checked={x.essential} onChange={e => upd("expenses", i, { essential: e.target.checked })} /> Essential</label>
                  {del("expenses", i, x.category)}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setData(d => ({ ...d, expenses: [...d.expenses, { id: uid(), category: "", amount: 0, essential: true }] }))}>+ Add expense</Button>
            </>)}

            {step === 2 && (<>
              <p className="text-sm text-navy-600">Every debt, including your mortgage. Use your latest statement for the balance and interest rate. No debts? Skip to the next step.</p>
              {data.debts.map((x, i) => (
                <div key={x.id} className={cx(row, "sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_100px_1fr_auto]")}>
                  <div><label htmlFor={`dn${i}`} className="text-xs">Name</label><input id={`dn${i}`} value={x.name} placeholder="e.g. Visa card" onChange={e => { const v = e.target.value; upd("debts", i, { name: v, ...(/house|home|mortgage|property/i.test(v) && x.type === "credit_card" ? { type: "mortgage" as DebtType } : {}) }); }} className="mt-1" /></div>
                  <div><label htmlFor={`dt${i}`} className="text-xs">Type</label><select id={`dt${i}`} value={x.type} onChange={e => upd("debts", i, { type: e.target.value as DebtType })} className="mt-1">{DEBT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                  {money("Balance owed", x.balance, v => upd("debts", i, { balance: v }), `db${i}`)}
                  <div><label htmlFor={`dr${i}`} className="text-xs">Interest % / yr</label><input id={`dr${i}`} inputMode="decimal" value={x.rate || ""} placeholder="0" onChange={e => upd("debts", i, { rate: num(e.target.value) })} className="mt-1" /></div>
                  {money("Min. payment / month", x.minPayment, v => upd("debts", i, { minPayment: v }), `dm${i}`)}
                  {del("debts", i, x.name)}
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setData(d => ({ ...d, debts: [...d.debts, { id: uid(), name: "", type: "credit_card", balance: 0, rate: 0, minPayment: 0 }] }))}>+ Add debt</Button>
            </>)}

            {step === 3 && (<>
              <div className="max-w-xs">{money("Cash savings / emergency fund", data.savings, v => setData(d => ({ ...d, savings: v })), "savings")}</div>
              <p className="text-sm text-navy-600">Other assets: property (today&apos;s value), vehicles, investments, retirement savings, business. Skip if none.</p>
              {data.debts.some(d => d.type === "mortgage" && d.balance > 0) && !data.assets.some(a => a.type === "property") && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">🏠 You have a home loan. Add the property&apos;s current value below, so your net worth is correct.</p>}
              {data.assets.map((x, i) => (
                <div key={x.id} className={cx(row, "sm:grid-cols-[1fr_1fr_180px_auto]")}>
                  <div><label htmlFor={`an${i}`} className="text-xs">Name</label><input id={`an${i}`} value={x.name} onChange={e => upd("assets", i, { name: e.target.value })} className="mt-1" /></div>
                  <div><label htmlFor={`at${i}`} className="text-xs">Type</label><select id={`at${i}`} value={x.type} onChange={e => upd("assets", i, { type: e.target.value as AssetType })} className="mt-1">{ASSET_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                  {money("Value", x.value, v => upd("assets", i, { value: v }), `av${i}`)}
                  {del("assets", i, x.name)}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {([["Property", "property"], ["Vehicle", "vehicle"], ["Retirement / KiwiSaver / super", "retirement"], ["Investments", "investments"], ["Business", "business"], ["Other asset", "other"]] as [string, AssetType][]).map(([l, t]) => (
                  <Button key={l} variant="secondary" size="sm" onClick={() => setData(d => ({ ...d, assets: [...d.assets, { id: uid(), name: l === "Property" ? (d.debts.find(x => x.type === "mortgage" && !d.assets.some(a => a.name === x.name))?.name ?? "Property") : l, type: t, value: 0 }] }))}>+ {l}</Button>
                ))}
              </div>
            </>)}

            {step === 4 && (<>
              <fieldset><legend className="text-sm font-semibold text-navy-800">Is any of this happening? (optional, helps us point you to the right help)</legend>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {SITUATION.map(([k, l]) => <label key={k} className="flex items-start gap-3 rounded-lg p-2 font-normal text-navy-700 hover:bg-navy-50"><input type="checkbox" checked={data.situation[k]} onChange={e => setData(d => ({ ...d, situation: { ...d.situation, [k]: e.target.checked } }))} className="mt-0.5" />{l}</label>)}
                </div>
              </fieldset>
              <div><label htmlFor="goals">Your goals <span className="font-normal text-navy-500">(optional)</span></label><textarea id="goals" rows={3} maxLength={600} value={data.goals} onChange={e => setData(d => ({ ...d, goals: e.target.value }))} placeholder={`e.g. Clear my credit card this year, save a ${fmtMoney(c, c.code === "PH" ? 100000 : 5000)} buffer, pay the mortgage off faster`} className="mt-1.5" /></div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-navy-50 p-4 text-sm sm:grid-cols-4">
                <div><p className="text-navy-500">Income</p><p className="font-bold">{sym}{totals.income.toLocaleString()}/mo</p></div>
                <div><p className="text-navy-500">Living costs</p><p className="font-bold">{sym}{totals.expenses.toLocaleString()}/mo</p></div>
                <div><p className="text-navy-500">Debts</p><p className="font-bold">{sym}{totals.debts.toLocaleString()}</p></div>
                <div><p className="text-navy-500">Assets & savings</p><p className="font-bold">{sym}{totals.assets.toLocaleString()}</p></div>
              </div>
            </>)}

            {step === STEPS.length - 1 && warnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
                <p className="font-semibold text-amber-900">Please check your numbers</p>
                <ul className="mt-2 space-y-2 text-sm text-amber-900">
                  {warnings.map((w, i) => <li key={i} className="flex flex-wrap items-start justify-between gap-2"><span>⚠️ {w.message}</span><button type="button" onClick={() => setStep(w.step)} className="font-semibold underline">Fix</button></li>)}
                </ul>
                <p className="mt-2 text-xs text-amber-800">You can still continue. These checks help make your results accurate.</p>
              </div>
            )}
            {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <div className="flex items-center justify-between gap-2 border-t border-navy-100 pt-4">
              <Button variant="secondary" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>← Back</Button>
              <Button type="submit" size="lg" disabled={pending}>{pending ? "Analysing…" : step < STEPS.length - 1 ? "Next →" : "See my Financial Health"}</Button>
            </div>
            <p className="text-center text-xs text-navy-500">{loggedIn ? "Your results will be saved to your account." : "No account needed. Nothing is saved unless you create a free account."} We never ask for bank logins.</p>
          </form>
        </>
      )}
    </Card>
  );
}
