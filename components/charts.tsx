"use client";
import {
  LabelList, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend, AreaChart, Area,
} from "recharts";

const PALETTE = ["#13a796", "#1d3561", "#5fdac9", "#4a6290", "#f59e0b", "#94a7c8", "#0d6b62", "#c4d0e4", "#ef4444"];
const short = (sym: string) => (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(1)}m` : a >= 1e3 ? `${Math.round(a / 1e3)}k` : `${Math.round(a)}`;
  return `${v < 0 ? "-" : ""}${sym}${s}`;
};
const full = (sym: string) => (v: unknown) => { const n = Math.round(Number(v)); return `${n < 0 ? "-" : ""}${sym}${Math.abs(n).toLocaleString("en")}`; };

/** Visually hidden data table so screen-reader users get the numbers. */
function SrTable({ caption, rows }: { caption: string; rows: [string, string][] }) {
  return (
    <table className="sr-only"><caption>{caption}</caption><tbody>{rows.map(([a, b]) => <tr key={a}><th scope="row">{a}</th><td>{b}</td></tr>)}</tbody></table>
  );
}

export function ExpenseDonut({ data, symbol }: { data: { name: string; value: number }[]; symbol: string }) {
  const d = data.filter(x => x.value > 0).sort((a, b) => b.value - a.value);
  if (!d.length) return <p className="text-sm text-navy-500">Add your monthly spending to see the breakdown.</p>;
  const total = d.reduce((s, x) => s + x.value, 0);
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`;
  return (
    <figure>
      <div className="relative h-56" aria-hidden>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={d} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="90%" paddingAngle={2} isAnimationActive={false}>
              {d.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip formatter={full(symbol)} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-navy-500">Total / month</span>
          <span className="text-lg font-bold text-navy-900">{full(symbol)(total)}</span>
        </div>
      </div>
      <table className="mt-3 w-full text-xs">
        <tbody>{d.map((x, i) => (
          <tr key={x.name} className="border-t border-navy-50">
            <td className="py-1"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: PALETTE[i % PALETTE.length] }} />{x.name}</td>
            <td className="py-1 text-right font-semibold text-navy-800">{full(symbol)(x.value)}</td>
            <td className="w-10 py-1 text-right text-navy-500">{pct(x.value)}</td>
          </tr>))}</tbody>
      </table>
    </figure>
  );
}

export function BalanceBars({ assets, debts, savings, symbol }: { assets: number; debts: number; savings: number; symbol: string }) {
  const data = [{ name: "Savings", value: savings }, { name: "Other assets", value: Math.max(0, assets - savings) }, { name: "Debts", value: debts }];
  return (
    <figure>
      <div className="h-56" aria-hidden>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: 8, right: 8, top: 22 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e9f3" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#4a6290" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={short(symbol)} tick={{ fontSize: 11, fill: "#4a6290" }} axisLine={false} tickLine={false} width={56} />
            <Tooltip formatter={full(symbol)} cursor={{ fill: "#f2f5fa" }} />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive={false}>
              {data.map((x, i) => <Cell key={i} fill={x.name === "Debts" ? "#1d3561" : i === 0 ? "#5fdac9" : "#13a796"} />)}
              <LabelList dataKey="value" position="top" formatter={(v: unknown) => short(symbol)(Number(v))} style={{ fontSize: 12, fontWeight: 700, fill: "#0b1b3a" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SrTable caption="Assets and debts" rows={data.map(x => [x.name, full(symbol)(x.value)])} />
    </figure>
  );
}

export function DebtBars({ data, symbol }: { data: { name: string; balance: number; rate: number }[]; symbol: string }) {
  if (!data.length) return <p className="text-sm text-navy-500">No debts entered.</p>;
  const rows = data.map(d => ({ ...d, label: `${short(symbol)(d.balance)} · ${d.rate}%` }));
  return (
    <figure>
      <div style={{ height: Math.max(160, data.length * 48) }} aria-hidden>
        <ResponsiveContainer>
          <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 112 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e3e9f3" />
            <XAxis type="number" tickFormatter={short(symbol)} tick={{ fontSize: 11, fill: "#4a6290" }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: "#1d3561" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={full(symbol)} cursor={{ fill: "#f2f5fa" }} />
            <Bar dataKey="balance" radius={[0, 8, 8, 0]} isAnimationActive={false}>
              {data.map((d, i) => <Cell key={i} fill={d.rate >= 15 ? "#ef4444" : d.rate >= 8 ? "#f59e0b" : "#13a796"} />)}
              <LabelList dataKey="label" position="right" style={{ fontSize: 11, fontWeight: 700, fill: "#0b1b3a" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-navy-500"><span className="text-red-500">■</span> 15%+ interest · <span className="text-amber-500">■</span> 8–15% · <span className="text-teal-500">■</span> under 8%</p>
      <SrTable caption="Debt balances" rows={data.map(d => [d.name, `${full(symbol)(d.balance)} at ${d.rate}%`])} />
    </figure>
  );
}

export function ScenarioChart({ scenarios, symbol }: { scenarios: { key: string; label: string; series: { month: number; debt: number }[] }[]; symbol: string }) {
  // Common grid: every 3 months until the slowest scenario reaches zero (max 40 years)
  const lastMonth = Math.min(480, Math.max(12, ...scenarios.map(s => {
    const zero = s.series.find(p => p.debt <= 0);
    return zero ? zero.month : s.series[s.series.length - 1]?.month ?? 12;
  })));
  const valueAt = (series: { month: number; debt: number }[], m: number) => {
    let v = series[0]?.debt ?? 0;
    for (const p of series) { if (p.month > m) break; v = p.debt; }
    return v;
  };
  const rows: Record<string, number>[] = [];
  for (let m = 0; m <= lastMonth + 3; m += 3) {
    const row: Record<string, number> = { month: m };
    for (const s of scenarios) row[s.key] = valueAt(s.series, m);
    rows.push(row);
  }
  const yearStep = lastMonth > 240 ? 60 : lastMonth > 96 ? 24 : 12;
  const ticks = Array.from({ length: Math.floor((lastMonth + 3) / yearStep) + 1 }, (_, i) => i * yearStep);
  const colors: Record<string, string> = { conservative: "#94a7c8", balanced: "#13a796", aggressive: "#1d3561" };
  return (
    <figure>
      <div className="h-72" aria-hidden>
        <ResponsiveContainer>
          <LineChart data={rows} margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f3" />
            <XAxis dataKey="month" type="number" domain={[0, "dataMax"]} ticks={ticks} tickFormatter={(m: number) => (m === 0 ? "Now" : `Yr ${m / 12}`)} tick={{ fontSize: 11, fill: "#4a6290" }} />
            <YAxis tickFormatter={short(symbol)} tick={{ fontSize: 11, fill: "#4a6290" }} width={60} />
            <Tooltip formatter={full(symbol)} labelFormatter={(m) => `Month ${m}`} />
            <Legend />
            {scenarios.map(s => <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={colors[s.key]} strokeWidth={s.key === "balanced" ? 3 : 2} dot={false} isAnimationActive={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <SrTable caption="Total debt remaining by scenario" rows={scenarios.map(s => [s.label, `debt-free around month ${s.series.find(p => p.debt <= 0)?.month ?? "40+ years"}`])} />
    </figure>
  );
}

export function SavingsArea({ series, symbol, target }: { series: { month: number; savings: number }[]; symbol: string; target: number }) {
  const d = series.filter(p => p.month <= 60);
  return (
    <figure>
      <div className="h-48" aria-hidden>
        <ResponsiveContainer>
          <AreaChart data={d} margin={{ left: 8, right: 16 }}>
            <defs><linearGradient id="sv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#13a796" stopOpacity={0.35} /><stop offset="100%" stopColor="#13a796" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f3" />
            <XAxis dataKey="month" tickFormatter={(m: number) => (m % 12 === 0 ? `Yr ${m / 12}` : "")} tick={{ fontSize: 11, fill: "#4a6290" }} />
            <YAxis tickFormatter={short(symbol)} tick={{ fontSize: 11, fill: "#4a6290" }} width={56} />
            <Tooltip formatter={full(symbol)} labelFormatter={(m) => `Month ${m}`} />
            <Area isAnimationActive={false} type="monotone" dataKey="savings" name="Savings" stroke="#13a796" fill="url(#sv)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <SrTable caption="Savings growth" rows={[["Emergency fund target", full(symbol)(target)], ["Savings after 5 years", full(symbol)(d[d.length - 1]?.savings ?? 0)]]} />
    </figure>
  );
}

export function ScoreHistory({ data }: { data: { date: string; health: number; stress: number }[] }) {
  return (
    <figure>
      <div className="h-56" aria-hidden>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ left: 0, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e3e9f3" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#4a6290" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#4a6290" }} width={32} />
            <Tooltip /><Legend />
            <Line type="monotone" dataKey="health" name="Health score" stroke="#13a796" strokeWidth={3} />
            <Line type="monotone" dataKey="stress" name="Stress score" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <SrTable caption="Score history" rows={data.map(d => [d.date, `health ${d.health}, stress ${d.stress}`])} />
    </figure>
  );
}
