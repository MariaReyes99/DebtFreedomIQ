import { CashRunwayChart } from "./charts";
import { Card, cx } from "./ui";

const addMonths = (m: number) => { const d = new Date(); d.setDate(d.getDate() + Math.round(m * 30.4)); return d; };
const dateText = (d: Date) => d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });

/** "When does the money run out?" Money in vs out, and the date savings hit zero at today's rate. */
export default function CashRunway({ income, living, debt, savings, symbol, fmt }: { income: number; living: number; debt: number; savings: number; symbol: string; fmt: (n: number) => string }) {
  const out = living + debt;
  const surplus = income - out;
  const runOut = surplus < 0 ? Math.max(0, savings) / -surplus : null; // months
  const months = runOut === null ? 12 : Math.min(24, Math.max(6, Math.ceil(runOut) + 3));
  const urgent = runOut !== null && runOut < 3;
  const actBy = runOut !== null ? addMonths(Math.max(0, runOut - 1)) : null;

  return (
    <Card as="section" className={cx(runOut !== null && "border-red-200")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Money in vs money out: when does the cash run out?</h2>
          <p className="mt-1 text-sm text-navy-600">Each month: <strong className="text-teal-700">{fmt(income)} in</strong> · <strong>{fmt(out)} out</strong> ({fmt(living)} living costs + {fmt(debt)} debt repayments).</p>
        </div>
      </div>

      <div className={cx("mt-4 rounded-xl p-4", runOut === null ? "bg-emerald-50 text-emerald-900" : urgent ? "border-2 border-amber-400 bg-amber-50 text-amber-950" : "bg-amber-50 text-amber-900")} role={runOut !== null ? "alert" : undefined}>
        {runOut === null ? (
          <p><strong>You&apos;re not running out of cash.</strong> At this rate you add about {fmt(surplus)} a month to your savings.</p>
        ) : savings <= 0 ? (
          <p><strong>You&apos;re already short {fmt(-surplus)} every month with no savings to cover it.</strong> Act now: call your bank and a free financial mentor this week.</p>
        ) : (
          <>
            <p className="text-sm font-bold uppercase tracking-wide">Action needed soon</p>
            <p className="text-lg font-bold">At your current spending, your {fmt(savings)} savings may last about {runOut < 1 ? `${Math.max(1, Math.round(runOut * 4.3))} week${Math.round(runOut * 4.3) === 1 ? "" : "s"}` : `${runOut.toFixed(1)} months`}, until around {dateText(addMonths(runOut))}.</p>
            <p className="mt-1 text-sm">You&apos;re short {fmt(-surplus)} every month. <strong>{urgent ? "Take action this week" : `Take action by ${dateText(actBy!)}`}</strong>: talk to your bank about your mortgage and to a free financial mentor before the money is gone. Banks have more options while you&apos;re still up to date.</p>
          </>
        )}
      </div>

      <div className="mt-4"><CashRunwayChart income={income} living={living} debt={debt} savings={Math.max(0, savings)} symbol={symbol} months={months} /></div>
      <p className="mt-2 text-xs text-navy-500">Uses your cash savings only (not KiwiSaver/super, vehicles or property) and assumes income and costs stay the same. Below the red line is money you&apos;d have to borrow or fall behind on.</p>
    </Card>
  );
}
