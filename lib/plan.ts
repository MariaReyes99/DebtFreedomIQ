import type { DebtItem } from "./types";

export type Strategy = "avalanche" | "snowball";
export type ScenarioKey = "conservative" | "balanced" | "aggressive";

export const SCENARIOS: Record<ScenarioKey, { label: string; blurb: string; toDebt: number; afterEmergencyToDebt: number; mortgageShare: number }> = {
  conservative: { label: "Conservative", blurb: "Build savings first, steady debt payoff. Lowest stress.", toDebt: 0.3, afterEmergencyToDebt: 0.5, mortgageShare: 0 },
  balanced: { label: "Balanced", blurb: "Split between debt and savings. A good default for most households.", toDebt: 0.6, afterEmergencyToDebt: 0.75, mortgageShare: 0.5 },
  aggressive: { label: "Aggressive", blurb: "Throw almost everything at debt. Fastest and cheapest, needs discipline.", toDebt: 0.9, afterEmergencyToDebt: 0.9, mortgageShare: 1 },
};

export type Milestone = { month: number; title: string };
export type ScenarioResult = {
  key: ScenarioKey;
  label: string;
  monthlyToDebt: number;
  monthlyToSavings: number;
  consumerDebtFreeMonth: number | null;
  mortgageFreeMonth: number | null;
  totalInterest: number;
  emergencyTarget: number;
  emergencyReachedMonth: number | null;
  payoffOrder: { name: string; month: number | null }[];
  milestones: Milestone[];
  series: { month: number; debt: number; savings: number }[]; // sampled
  feasible: boolean;
};

const CAP = 480; // 40 years

export function buildScenarios(opts: {
  debts: DebtItem[]; surplus: number; savings: number; monthlyNeeds: number; strategy: Strategy;
}): ScenarioResult[] {
  return (Object.keys(SCENARIOS) as ScenarioKey[]).map(k => simulate(k, opts));
}

function simulate(key: ScenarioKey, { debts, surplus, savings, monthlyNeeds, strategy }:
  { debts: DebtItem[]; surplus: number; savings: number; monthlyNeeds: number; strategy: Strategy }): ScenarioResult {
  const cfg = SCENARIOS[key];
  const extra = Math.max(0, surplus);
  const emergencyTarget = Math.round(monthlyNeeds * (key === "aggressive" ? 1 : 3));
  const ds = debts.filter(d => d.balance > 0).map(d => ({ ...d, bal: d.balance }));
  const consumer = ds.filter(d => d.type !== "mortgage");
  const order = [...consumer].sort((a, b) => strategy === "avalanche" ? b.rate - a.rate || a.bal - b.bal : a.bal - b.bal || b.rate - a.rate);
  const mortgages = ds.filter(d => d.type === "mortgage");

  let sav = savings || 0;
  let totalInterest = 0;
  const paid: Record<string, number> = {};
  const milestones: Milestone[] = [];
  const series: { month: number; debt: number; savings: number }[] = [];
  let emergencyReachedMonth: number | null = sav >= emergencyTarget ? 0 : null;
  const startConsumer = consumer.reduce((s, d) => s + d.bal, 0);
  const quarterMarks = [0.25, 0.5, 0.75];
  let consumerFree: number | null = startConsumer === 0 ? 0 : null;
  let mortgageFree: number | null = mortgages.length ? null : null;
  let m = 0;

  const remaining = () => ds.reduce((s, d) => s + Math.max(0, d.bal), 0);
  series.push({ month: 0, debt: Math.round(remaining()), savings: Math.round(sav) });

  while (m < CAP && (remaining() > 0.5 || (emergencyReachedMonth === null && extra > 0))) {
    m++;
    for (const d of ds) if (d.bal > 0) { const int = d.bal * (d.rate / 100 / 12); d.bal += int; totalInterest += int; }
    // minimums
    let freed = 0;
    for (const d of ds) {
      if (d.bal <= 0) { freed += d.minPayment; continue; } // rolled-over payments ("snowball")
      const pay = Math.min(d.minPayment, d.bal); d.bal -= pay; freed += d.minPayment - pay;
    }
    const consumerLeft = consumer.some(d => d.bal > 0.5);
    const share = emergencyReachedMonth === null ? cfg.toDebt : cfg.afterEmergencyToDebt;
    let toDebt = (extra * share) + freed;
    let toSav = extra * (1 - share);
    if (!consumerLeft) {
      // consumer debt gone → part of the debt money goes to the mortgage, rest to savings
      const mShare = mortgages.some(d => d.bal > 0.5) ? cfg.mortgageShare : 0;
      toSav += toDebt * (1 - mShare); toDebt = toDebt * mShare;
    }
    for (const t of [...order, ...mortgages]) {
      const d = ds.find(x => x.id === t.id)!;
      if (d.bal <= 0 || toDebt <= 0) continue;
      const pay = Math.min(d.bal, toDebt); d.bal -= pay; toDebt -= pay;
    }
    sav += toSav + Math.max(0, toDebt);
    for (const d of ds) if (d.bal <= 0.5 && paid[d.id] === undefined) { d.bal = 0; paid[d.id] = m; milestones.push({ month: m, title: `${d.name} paid off 🎉` }); }
    const cLeft = consumer.reduce((s, d) => s + Math.max(0, d.bal), 0);
    while (startConsumer > 0 && quarterMarks.length && cLeft <= startConsumer * (1 - quarterMarks[0])) {
      const q = quarterMarks.shift()!; milestones.push({ month: m, title: `${Math.round(q * 100)}% of consumer debt cleared` });
    }
    if (consumerFree === null && startConsumer > 0 && cLeft <= 0.5) { consumerFree = m; milestones.push({ month: m, title: "Consumer debt-free! 🏁" }); }
    if (emergencyReachedMonth === null && sav >= emergencyTarget) { emergencyReachedMonth = m; milestones.push({ month: m, title: `Emergency fund reached (${Math.round(emergencyTarget)})` }); }
    if (mortgages.length && mortgageFree === null && mortgages.every(d => d.bal <= 0.5)) mortgageFree = m;
    if (m <= 24 || m % 3 === 0) series.push({ month: m, debt: Math.round(remaining()), savings: Math.round(sav) });
  }
  const feasible = remaining() <= 0.5 || m < CAP;
  return {
    key, label: cfg.label,
    monthlyToDebt: Math.round(extra * cfg.toDebt), monthlyToSavings: Math.round(extra * (1 - cfg.toDebt)),
    consumerDebtFreeMonth: consumerFree, mortgageFreeMonth: mortgageFree,
    totalInterest: Math.round(totalInterest), emergencyTarget, emergencyReachedMonth,
    payoffOrder: [...order, ...mortgages].map(d => ({ name: d.name, month: paid[d.id] ?? null })),
    milestones: milestones.sort((a, b) => a.month - b.month), series, feasible,
  };
}

export function fmtMonths(m: number | null) {
  if (m === null) return "40+ years";
  if (m === 0) return "Now";
  const y = Math.floor(m / 12), r = m % 12;
  return y ? `${y} yr${y > 1 ? "s" : ""}${r ? ` ${r} mo` : ""}` : `${r} months`;
}

export function monthToDate(m: number | null) {
  if (m === null) return "—";
  const d = new Date(); d.setMonth(d.getMonth() + m);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
