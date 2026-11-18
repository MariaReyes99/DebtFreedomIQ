"use client";
import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { comparePlatforms } from "@/research/lib/finance/platform-comparison";
import { Card } from "./ui";

type Opt = { id: string; name: string; expectedReturnPct: number; annualFeePct: number; monthlyAccountFee: number };
const COLORS = ["#13a796", "#1d3561", "#f59e0b", "#94a7c8"];
const LOOKUP: Record<string, { label: string; url: string }[]> = {
  NZ: [{ label: "Sorted's KiwiSaver fund finder", url: "https://sorted.org.nz/tools/kiwisaver-fund-finder" }, { label: "Disclose Register (fund updates)", url: "https://disclose-register.companiesoffice.govt.nz" }],
  AU: [{ label: "Moneysmart", url: "https://moneysmart.gov.au" }], US: [{ label: "Investor.gov", url: "https://www.investor.gov" }],
  GB: [{ label: "MoneyHelper", url: "https://www.moneyhelper.org.uk" }], PH: [{ label: "SEC Philippines", url: "https://www.sec.gov.ph" }],
};

/** Same money, different platforms: what fees do to the balance over time. Figures are editable, not a ranking. */
export default function PlatformCompare({ startBalance, monthly, years: initialYears, countryCode, fmt }: { startBalance: number; monthly: number; years: number; countryCode: string; fmt: (n: number) => string }) {
  const [balance, setBalance] = useState(Math.round(startBalance));
  const [contrib, setContrib] = useState(Math.max(0, Math.round(monthly)));
  const [years, setYears] = useState(Math.min(40, Math.max(5, initialYears)));
  const [opts, setOpts] = useState<Opt[]>([
    { id: "a", name: "Your current provider", expectedReturnPct: 6, annualFeePct: 1.0, monthlyAccountFee: 0 },
    { id: "b", name: "Low-cost index fund", expectedReturnPct: 6, annualFeePct: 0.25, monthlyAccountFee: 0 },
  ]);
  const set = (id: string, patch: Partial<Opt>) => setOpts(o => o.map(x => (x.id === id ? { ...x, ...patch } : x)));
  const result = useMemo(() => {
    try { return comparePlatforms({ initialBalance: balance, monthlyContribution: contrib, years, inflationPct: 2.5, options: opts.map((o, i) => ({ ...o, name: o.name.trim() || `Platform ${"ABCD"[i]}` })) }); } catch { return null; }
  }, [balance, contrib, years, opts]);
  const chart = useMemo(() => result ? result.options[0].series.map((p, k) => Object.fromEntries([["year", p.year], ...result.options.map(o => [o.name, Math.round(o.series[k]?.balance ?? 0)])])) : [], [result]);
  const best = result ? Math.max(...result.options.map(o => o.endingBalanceReal)) : 0;
  const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  return (
    <Card as="section">
      <h2 className="text-lg font-bold">Fund comparison</h2>
      <p className="mt-1 text-sm text-navy-600">Same money, different platforms or funds: see what fees do over time. Replace the sample figures with each provider&apos;s current fees (from its fund update or website). A comparison of your figures, not a ranking or advice.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Starting amount<input type="number" min={0} value={balance} onChange={e => setBalance(num(e.target.value))} className="mt-1" /></label>
        <label className="text-sm">Added each month<input type="number" min={0} value={contrib} onChange={e => setContrib(num(e.target.value))} className="mt-1" /></label>
        <label className="text-sm">Years<input type="number" min={1} max={60} value={years} onChange={e => setYears(Math.max(1, Math.min(60, num(e.target.value))))} className="mt-1" /></label>
      </div>
      {result && (
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...result.options].sort((x, y) => y.endingBalanceReal - x.endingBalanceReal).map((r, k) => {
            const i = result.options.indexOf(r), top = result.options.reduce((m, o) => Math.max(m, o.endingBalanceReal), 0);
            return (
              <li key={r.id} className={`rounded-xl border p-3 ${k === 0 ? "border-2 border-emerald-400 bg-emerald-50/60" : "border-navy-100"}`}>
                <p className="text-xs font-bold text-navy-500">{k === 0 ? "🥇 Most left after fees" : `#${k + 1}`}</p>
                <p className="mt-0.5 flex items-center gap-1.5 font-semibold"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />{r.name}</p>
                <p className="mt-1 text-xl font-bold">{fmt(r.endingBalanceReal)}</p>
                <p className="text-xs text-navy-500">after {years} yrs · fees cost {fmt(r.feeImpact)}</p>
                {k > 0 && <p className="mt-1 text-xs font-semibold text-red-700">{fmt(top - r.endingBalanceReal)} less than #1</p>}
              </li>
            );
          })}
        </ol>
      )}
      <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-teal-700">Edit the platforms and fees</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-navy-500"><th className="font-normal">Platform / fund</th><th className="font-normal">Return before fees %</th><th className="font-normal">Yearly fee %</th><th className="font-normal">Account fee / month</th><th className="text-right font-normal">After {years} yrs (today&apos;s money)</th><th className="text-right font-normal">Fees cost you</th><th /></tr></thead>
          <tbody>
            {opts.map((o, i) => {
              const r = result?.options[i];
              return (
                <tr key={o.id} className="border-t border-navy-100">
                  <td className="py-2 pr-2"><span className="mr-2 inline-block h-3 w-3 rounded-full align-middle" style={{ background: COLORS[i] }} /><input value={o.name} onChange={e => set(o.id, { name: e.target.value })} className="inline-block w-44 align-middle" aria-label="Platform name" /></td>
                  <td className="pr-2"><input type="number" step="0.25" value={o.expectedReturnPct} onChange={e => set(o.id, { expectedReturnPct: num(e.target.value) })} className="w-20" aria-label={`${o.name} return`} /></td>
                  <td className="pr-2"><input type="number" step="0.05" min={0} value={o.annualFeePct} onChange={e => set(o.id, { annualFeePct: num(e.target.value) })} className="w-20" aria-label={`${o.name} yearly fee`} /></td>
                  <td className="pr-2"><input type="number" min={0} value={o.monthlyAccountFee} onChange={e => set(o.id, { monthlyAccountFee: num(e.target.value) })} className="w-20" aria-label={`${o.name} account fee`} /></td>
                  <td className={`text-right font-bold ${r && r.endingBalanceReal === best ? "text-emerald-600" : ""}`}>{r ? fmt(r.endingBalanceReal) : "—"}</td>
                  <td className="text-right text-red-700">{r ? fmt(r.feeImpact) : "—"}</td>
                  <td className="pl-2">{opts.length > 2 && <button type="button" onClick={() => setOpts(x => x.filter(y => y.id !== o.id))} className="text-navy-400 hover:text-red-600" aria-label={`Remove ${o.name}`}>✕</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {opts.length < 4 && <button type="button" onClick={() => setOpts(o => [...o, { id: Math.random().toString(36).slice(2, 7), name: `Platform ${"ABCD"[o.length]}`, expectedReturnPct: 6, annualFeePct: 0.5, monthlyAccountFee: 0 }])} className="mt-2 text-sm font-semibold text-teal-700">+ Add a platform</button>}
      </details>
      {chart.length > 0 && (
        <div className="mt-4 h-64" aria-hidden>
          <ResponsiveContainer>
            <LineChart data={chart} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" tickFormatter={v => `Yr ${v}`} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => fmt(v).replace(/(\d)(\d{3}),\d{3}$/, "$1$2k")} tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={v => fmt(Number(v))} labelFormatter={v => `Year ${v}`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {result?.options.map((o, i) => <Line key={o.id} dataKey={o.name} stroke={COLORS[i]} strokeWidth={2.5} dot={false} isAnimationActive={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-2 text-xs text-navy-500">Balances on the chart are before inflation; the table is in today&apos;s money (2.5% inflation). Fee cost includes the growth those fees would have earned. Taxes, spreads and currency costs aren&apos;t included. Look up real fees: {(LOOKUP[countryCode] ?? LOOKUP.NZ).map((l, k) => <span key={l.url}>{k ? " · " : ""}<a href={l.url} target="_blank" rel="noopener" className="font-semibold text-teal-700">{l.label}</a></span>)}.</p>
    </Card>
  );
}
