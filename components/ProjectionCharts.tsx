"use client";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "./ui";

type P = { m: number; cash: number; owed: number };
const short = (sym: string) => (v: number) => {
  const a = Math.abs(v), s = v < 0 ? "-" : "";
  return a >= 1e6 ? `${s}${sym}${(a / 1e6).toFixed(1)}m` : a >= 1e3 ? `${s}${sym}${Math.round(a / 1e3)}k` : `${s}${sym}${Math.round(a)}`;
};
const monthLabel = (m: number) => { const d = new Date(); d.setMonth(d.getMonth() + m); return d.toLocaleDateString("en-NZ", { month: "short", year: "2-digit" }); };

function Chart({ title, note, data, now, after, symbol, fmt, zeroLine, xFmt }: { title: string; note: string; data: Record<string, number>[]; now: string; after: string | null; symbol: string; fmt: (n: number) => string; zeroLine?: boolean; xFmt: (v: number) => string }) {
  return (
    <Card as="section" className="p-4 sm:p-5">
      <h3 className="font-bold">{title}</h3>
      <p className="text-xs text-navy-500">{note}</p>
      <div className="mt-2 h-56" aria-hidden>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="x" tickFormatter={xFmt} tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis tickFormatter={short(symbol)} tick={{ fontSize: 11 }} width={56} />
            <Tooltip formatter={v => fmt(Number(v))} labelFormatter={v => xFmt(Number(v))} />
            {zeroLine && <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />}
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="now" name={now} stroke="#94a7c8" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
            {after && <Line dataKey="after" name={after} stroke="#13a796" strokeWidth={3} dot={false} isAnimationActive={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** Where things are heading: cash, money owed, and (Premium Plus) financial position to 90. Now vs with your choices. */
export default function ProjectionCharts({ before, after, changed, longBefore, longAfter, symbol, fmt }: {
  before: P[]; after: P[]; changed: boolean; symbol: string; fmt: (n: number) => string;
  longBefore?: { age: number; netWorth: number }[] | null; longAfter?: { age: number; netWorth: number }[] | null;
}) {
  const cash = before.slice(0, 25).map((p, k) => ({ x: p.m, now: p.cash, after: after[k]?.cash ?? p.cash }));
  const owed = before.filter(p => p.m % 3 === 0).map(p => ({ x: p.m, now: p.owed, after: after.find(a => a.m === p.m)?.owed ?? p.owed }));
  const lastCash = cash[cash.length - 1];
  const youLabel = changed ? "With your choices" : null;
  const pos = longBefore?.map(p => ({ x: p.age, now: p.netWorth, after: longAfter?.find(a => a.age === p.age)?.netWorth ?? p.netWorth })) ?? null;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Chart title="💰 Cash in the bank: next 2 years" note={`In 2 years: ${fmt(changed ? lastCash.after : lastCash.now)}${changed ? ` (now heading for ${fmt(lastCash.now)})` : ""}. Below the red line = borrowing or falling behind.`}
        data={cash} now="If nothing changes" after={youLabel} symbol={symbol} fmt={fmt} zeroLine xFmt={monthLabel} />
      <Chart title="💳 Money you owe: next 10 years" note={`In 10 years: ${fmt(changed ? owed[owed.length - 1].after : owed[owed.length - 1].now)}${changed ? ` (instead of ${fmt(owed[owed.length - 1].now)})` : ""}.`}
        data={owed} now="If nothing changes" after={youLabel} symbol={symbol} fmt={fmt} xFmt={v => (v === 0 ? "Now" : `Yr ${Math.round(v / 12)}`)} />
      {pos ? <Chart title="📈 Your financial position to age 90" note="Expected case, today's money. Doesn't include NZ Super or other pensions yet." data={pos} now="If nothing changes" after={youLabel} symbol={symbol} fmt={fmt} zeroLine xFmt={v => `Age ${v}`} />
        : <Card className="flex items-center justify-center p-5 text-center text-sm text-navy-500">📈 Your financial position to age 90 shows here with Premium Plus once your age is entered.</Card>}
    </div>
  );
}
