/**
 * Turns the numbers into decision support: how risky things are, and how each scenario scores.
 * Transparent rules (no black box), shown to the person as "our scoring". General information, not advice.
 */
import type { AssessmentInput } from "./types";
import { calculate } from "./finance";
import { applyChoices, monthlyPath, propertiesOf, NO_CHOICES, type Choices } from "./whatif";
import type { QuickPick } from "./quickpicks";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** How hard, how risky and how long each kind of move is (1 = easy/low, 5 = hard/high). */
export const MOVE_META: { match: RegExp; difficulty: number; risk: number; time: string }[] = [
  { match: /^extra/, difficulty: 1, risk: 1, time: "This week" },
  { match: /^savings-clear/, difficulty: 1, risk: 2, time: "This week" },
  { match: /^io-/, difficulty: 2, risk: 2, time: "1–3 weeks" },
  { match: /^refi/, difficulty: 2, risk: 1, time: "2–4 weeks" },
  { match: /^inv/, difficulty: 2, risk: 3, time: "1–2 weeks" },
  { match: /^car/, difficulty: 2, risk: 1, time: "2–4 weeks" },
  { match: /^val-/, difficulty: 3, risk: 2, time: "2–6 weeks" },
  { match: /^boarder/, difficulty: 3, risk: 2, time: "2–6 weeks" },
  { match: /^ks/, difficulty: 3, risk: 3, time: "2–4 weeks" },
  { match: /^sell-/, difficulty: 4, risk: 3, time: "2–4 months" },
  { match: /^down-/, difficulty: 5, risk: 4, time: "3–6 months" },
];
export const metaFor = (id: string) => MOVE_META.find(m => m.match.test(id)) ?? { difficulty: 3, risk: 3, time: "Varies" };

export type Meters = { financialRisk: number; housingSecurity: number; retirementReadiness: number };

/** 0–100 meters. Financial risk: higher is worse. Housing security and retirement readiness: higher is better. */
export function meters(i: AssessmentInput, longRunsOutAge?: number | null, endAge = 90): Meters {
  const m = calculate(i);
  const income = Math.max(1, m.monthlyIncome);
  const runway = m.monthlySurplus < 0 ? (i.savings > 0 ? i.savings / -m.monthlySurplus : 0) : 24;
  const short = m.monthlySurplus < 0 ? Math.min(1, -m.monthlySurplus / income) : 0;
  const dti = Math.min(1.5, m.debtToIncome) / 1.5;
  const lev = m.totalAssets > 0 ? Math.min(1, m.totalDebts / m.totalAssets) : m.totalDebts > 0 ? 1 : 0;
  const runwayRisk = runway >= 12 ? 0 : (12 - runway) / 12;
  const financialRisk = Math.round(clamp(100 * (0.35 * short + 0.3 * dti + 0.25 * runwayRisk + 0.1 * lev)));

  const home = propertiesOf(i).find(p => p.use === "home") ?? propertiesOf(i)[0];
  const homeLvr = home?.debt && home.asset.value > 0 ? Math.min(1, home.debt.balance / home.asset.value) : 0;
  const homePay = home?.debt ? Math.min(1, home.debt.minPayment / income) : 0;
  const housingSecurity = home ? Math.round(clamp(100 - 100 * (0.45 * runwayRisk + 0.3 * homePay + 0.25 * homeLvr))) : Math.round(clamp(100 - 100 * (0.6 * runwayRisk + 0.4 * short)));

  let retirementReadiness: number;
  if (longRunsOutAge !== undefined) {
    retirementReadiness = longRunsOutAge === null ? 90 : Math.round(clamp(20 + ((longRunsOutAge - 60) / (endAge - 60)) * 70, 5, 90));
  } else {
    const nest = i.savings + i.assets.filter(a => a.type === "retirement" || a.type === "investments").reduce((t, a) => t + a.value, 0);
    retirementReadiness = Math.round(clamp((nest / Math.max(1, (m.monthlyExpenses * 12) * 20)) * 100));
  }
  return { financialRisk, housingSecurity, retirementReadiness };
}

export type Scored = {
  key: string; label: string; icon: string; choices: Choices; pickIds: string[];
  surplus: number; owed10: number; position10: number | null; risk: number; path?: number[];
  scores: { cashflow: number; risk: number; wealth: number; ease: number; overall: number };
};

/** Score a set of choices against "keep everything". */
export function scoreScenario(base: AssessmentInput, choices: Choices, pickIds: string[], extra?: { position10?: number | null; basePosition10?: number | null }) {
  const b = calculate(base);
  const after = applyChoices(base, choices).input;
  const a = calculate(after);
  const income = Math.max(1, a.monthlyIncome || b.monthlyIncome);
  const owed10 = monthlyPath(after, 120)[120].owed;
  const riskNow = meters(base).financialRisk, risk = meters(after).financialRisk;
  // Cash flow: share of the monthly gap closed (0–70), then how much is left over (70–100)
  const gapBase = Math.max(-b.monthlySurplus, income * 0.25);
  const cashflow = a.monthlySurplus >= 0 ? clamp(70 + 30 * Math.min(1, a.monthlySurplus / income / 0.2)) : clamp(70 * (1 - Math.min(1, -a.monthlySurplus / gapBase)));
  const owedBase = monthlyPath(base, 120)[120].owed;
  const riskScore = clamp(100 - risk + Math.max(0, riskNow - risk) * 0.5 + (owedBase > 0 ? Math.max(-5, 20 * (1 - owed10 / owedBase)) : 0));
  const nwBase = extra?.basePosition10 ?? b.netWorth, nw = extra?.position10 ?? a.netWorth;
  const wealth = clamp(60 + ((nw - nwBase) / Math.max(1, Math.abs(nwBase))) * 200);
  const ease = pickIds.length ? clamp(100 - (pickIds.reduce((t, id) => t + metaFor(id).difficulty, 0) / pickIds.length - 1) * 20 - (pickIds.length - 1) * 5) : 100;
  const overall = Math.round(0.4 * cashflow + 0.3 * riskScore + 0.2 * wealth + 0.1 * ease);
  return { surplus: Math.round(a.monthlySurplus), owed10, position10: extra?.position10 ?? null, risk, scores: { cashflow: Math.round(cashflow), risk: Math.round(riskScore), wealth: Math.round(wealth), ease: Math.round(ease), overall } };
}

/** The scenarios worth comparing: keep everything, the strongest single moves, a balanced mix and a bigger-change mix. */
export function scenarioSet(base: AssessmentInput, picks: QuickPick[], impact: Record<string, number>, allowed: (p: QuickPick) => boolean) {
  const asset = (id: string) => id.split("-").slice(1).join("-");
  const usable = picks.filter(p => allowed(p) && impact[p.id] > 0 && !p.retireAge && p.group !== "life");
  const tier = (id: string) => (id.startsWith("down-") ? 3 : id.startsWith("sell-") || id.startsWith("ks") ? 2 : 1);
  const combo = (pool: QuickPick[], max: number, stopWhenClosed: boolean) => {
    const out: QuickPick[] = []; let c = NO_CHOICES;
    for (const p of pool) {
      if (out.length >= max || (stopWhenClosed && calculate(applyChoices(base, c).input).monthlySurplus >= 0)) break;
      if (out.some(x => x.id === p.id || (asset(x.id) && asset(x.id) === asset(p.id)))) continue;
      out.push(p); c = p.apply(c);
    }
    return { picks: out, choices: c };
  };
  const balanced = combo([...usable].sort((a, b) => tier(a.id) - tier(b.id) || impact[b.id] - impact[a.id]), 4, true);
  const bigger = combo([...usable].filter(p => !p.id.startsWith("down-")).sort((a, b) => impact[b.id] - impact[a.id]), 4, false);
  const singles = [...usable].sort((a, b) => impact[b.id] - impact[a.id]).slice(0, 4);
  const list = [
    { key: "keep", label: "Keep everything as it is", icon: "⏸️", choices: NO_CHOICES, pickIds: [] as string[] },
    ...singles.map(p => ({ key: p.id, label: p.title, icon: p.icon, choices: p.apply(NO_CHOICES), pickIds: [p.id] })),
    ...(balanced.picks.length > 1 ? [{ key: "balanced", label: `Balanced mix: ${balanced.picks.map(p => p.title).join(" + ")}`, icon: "⚖️", choices: balanced.choices, pickIds: balanced.picks.map(p => p.id) }] : []),
    ...(bigger.picks.length > 1 && bigger.picks.map(p => p.id).join() !== balanced.picks.map(p => p.id).join() ? [{ key: "bigger", label: `Bigger changes: ${bigger.picks.map(p => p.title).join(" + ")}`, icon: "🚀", choices: bigger.choices, pickIds: bigger.picks.map(p => p.id) }] : []),
  ];
  return list;
}

/** Difficulty, risk and time for recovery options shown on Financial Health and the Freedom Plan. */
const SOLUTION_META: Record<string, { difficulty: number; risk: number; time: string }> = {
  "lost-income": { difficulty: 2, risk: 1, time: "This week" }, entitlements: { difficulty: 1, risk: 1, time: "1–2 weeks" }, hardship: { difficulty: 2, risk: 1, time: "1–3 weeks" },
  "high-interest": { difficulty: 1, risk: 2, time: "This week" }, insurance: { difficulty: 2, risk: 2, time: "1–2 weeks" }, trim: { difficulty: 2, risk: 1, time: "This month" },
  "rent-income": { difficulty: 3, risk: 2, time: "1–2 months" }, boarder: { difficulty: 3, risk: 2, time: "2–6 weeks" },
  "sell-investments": { difficulty: 2, risk: 3, time: "1–2 weeks" }, "sell-valuables": { difficulty: 3, risk: 2, time: "2–6 weeks" }, "swap-car": { difficulty: 2, risk: 1, time: "2–4 weeks" },
  sell: { difficulty: 4, risk: 3, time: "2–4 months" }, "student-loan": { difficulty: 1, risk: 1, time: "1–2 weeks" }, "child-support": { difficulty: 2, risk: 1, time: "2–6 weeks" }, "family-support": { difficulty: 2, risk: 1, time: "2–4 weeks" },
};
export const solutionMeta = (id: string) => SOLUTION_META[id] ?? (id.startsWith("restructure-") ? { difficulty: 2, risk: 2, time: "1–3 weeks" } : id.startsWith("fix-") ? { difficulty: 1, risk: 1, time: "Now" } : { difficulty: 3, risk: 3, time: "Varies" });

/** Difficulty, risk and time for a Freedom Plan step, from its id. Null when it's a simple to-do. */
export function stepMeta(id: string): { difficulty: number; risk: number; time: string } | null {
  if (id.startsWith("s-")) return solutionMeta(id.slice(2));
  if (/^c-.*-(interest_only|longer_term)$/.test(id) || id.startsWith("c-term-")) return metaFor("io-");
  if (/^c-.*-rent$/.test(id)) return { difficulty: 3, risk: 2, time: "1–2 months" };
  if (/^c-.*-(appraise|tax|list)$/.test(id)) return metaFor("sell-");
  if (id.startsWith("c-sell-")) return metaFor("inv");
  if (id.startsWith("c-rate-")) return metaFor("refi");
  if (id.startsWith("c-extra-")) return metaFor("extra");
  return null;
}
