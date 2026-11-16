import type { Solution } from "@/lib/solutions";
import { Badge, Card } from "./ui";

const KIND: Record<Solution["kind"], { label: string; tone: "amber" | "teal" | "navy" | "green" | "gray" }> = {
  fix: { label: "Check first", tone: "amber" }, debt: { label: "Loans", tone: "navy" }, income: { label: "Income", tone: "green" },
  cost: { label: "Spending", tone: "teal" }, asset: { label: "Property", tone: "navy" }, support: { label: "Support", tone: "gray" },
};

export default function GapPlan({ options, gap, fmt }: { options: Solution[]; gap: number; fmt: (n: number) => string }) {
  if (!options.length) return null;
  const real = options.filter(o => o.kind !== "fix");
  let running = 0;
  return (
    <Card as="section">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">{gap > 0 ? `Ways to close your ${fmt(gap)}/month gap` : "Ways to boost your monthly cash flow"}</h2>
          <p className="mt-1 text-sm text-navy-600">Options based on your numbers, biggest impact first. Some are alternatives (e.g. sell <em>or</em> restructure the same property), so you won&apos;t need them all. Estimates only. Discuss big decisions with a free financial mentor or licensed adviser.</p>
        </div>
        <a href="/whatif" className="text-sm font-semibold text-teal-700 hover:underline">🧪 Test your own choices in What-if →</a>
        {gap > 0 && <p className="text-sm font-semibold text-navy-700">Options found: up to <span className="text-teal-700">{fmt(real.reduce((a, o) => a + o.monthly, 0))}/month</span></p>}
      </div>
      <ol className="mt-4 space-y-3">
        {options.map(o => {
          if (o.kind !== "fix") running += o.monthly;
          const covered = gap > 0 ? Math.min(100, Math.round((running / gap) * 100)) : 0;
          return (
            <li key={o.id} className="rounded-xl border border-navy-100 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2"><Badge tone={KIND[o.kind].tone}>{KIND[o.kind].label}</Badge><h3 className="font-semibold">{o.title}</h3></div>
                <div className="text-right">
                  {o.monthly > 0 ? <p className="font-bold text-emerald-600">{o.kind === "fix" ? "up to " : "+"}{fmt(o.monthly)}/mo</p> : <p className="text-sm text-navy-500">{o.kind === "fix" ? "check this" : "amount varies"}</p>}
                  {o.oneOff ? <p className="text-xs text-navy-500">+ {fmt(o.oneOff)} one-off</p> : null}
                </div>
              </div>
              <p className="mt-1.5 text-sm text-navy-700">{o.detail}</p>
              {o.caution && <p className="mt-1.5 text-xs text-amber-800">⚠️ {o.caution}</p>}
              {gap > 0 && o.kind !== "fix" && o.monthly > 0 && (
                <div className="mt-2 flex items-center gap-2 text-xs text-navy-500">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy-100" aria-hidden><div className="h-full rounded-full bg-teal-500" style={{ width: `${covered}%` }} /></div>
                  <span>{covered >= 100 ? "Gap closed ✓" : `${covered}% of gap covered so far`}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
