/**
 * Plain-language "what's good / what needs attention" from the numbers,
 * and a "so what?" line for every figure. Written for someone under stress.
 */
import type { AssessmentInput, Metrics } from "./types";

export type Insight = { title: string; detail: string };
const pct = (n: number) => `${Math.round(n * 100)}%`;

export const LABELS = {
  netWorth: "Your financial position",
  dti: "Debt load",
  surplus: "Left over each month",
  safety: "Safety savings",
  interest: "Interest you pay",
  owned: "Things you own",
  owed: "Money you owe",
} as const;

export function insights(i: AssessmentInput, m: Metrics, fmt: (n: number) => string) {
  const good: Insight[] = [], attention: Insight[] = [];
  const runway = m.monthlySurplus < 0 && i.savings > 0 ? i.savings / -m.monthlySurplus : null;

  if (m.monthlySurplus >= 0) good.push({ title: "More comes in than goes out", detail: `You have about ${fmt(m.monthlySurplus)} left over each month.` });
  else attention.push({ title: `You're short ${fmt(-m.monthlySurplus)} a month`, detail: runway !== null ? `Your savings would cover this for about ${runway < 1 ? "a few weeks" : `${runway.toFixed(1)} months`}. This is the first thing to fix.` : "With no savings to cover it, this is the first thing to fix." });

  if (m.netWorth > 0) good.push({ title: "You own more than you owe", detail: `Things you own (${fmt(m.totalAssets)}) are worth more than money you owe (${fmt(m.totalDebts)}). That gives you options.` });
  else if (m.totalDebts > 0) attention.push({ title: "You owe more than you own", detail: `Money you owe (${fmt(m.totalDebts)}) is more than things you own (${fmt(m.totalAssets)}).` });

  if (m.monthlyIncome > 0) {
    if (m.debtToIncome <= 0.36) good.push({ title: "Repayments are manageable", detail: `${pct(m.debtToIncome)} of your income goes on debt repayments. Below 36% is usually healthy.` });
    else attention.push({ title: "Repayments take too much of your income", detail: `${pct(m.debtToIncome)} of your income goes on debt repayments. Below 36% is usually healthy.` });
  }

  if (m.emergencyMonths >= 3 && m.monthlySurplus >= 0) good.push({ title: "You have safety savings", detail: `About ${m.emergencyMonths.toFixed(1)} months of essential costs put aside.` });
  else if (m.emergencyMonths < 1) attention.push({ title: "Little or no safety savings", detail: "Even a small buffer helps you avoid new debt when something goes wrong." });

  if (m.highInterestShare > 0) attention.push({ title: "Some debt is very expensive", detail: `${pct(m.highInterestShare)} of your non-mortgage debt costs 15% a year or more. That's usually the first debt to clear.` });
  else if (m.consumerDebts === 0 && m.totalDebts > 0) good.push({ title: "No expensive debt", detail: "No credit cards or loans charging 15% or more." });

  const invest = i.assets.filter(a => a.type === "investments" || a.type === "other").reduce((t, a) => t + a.value, 0);
  if (invest > 0 && m.monthlySurplus < 0) good.push({ title: "You have things you could sell if needed", detail: `About ${fmt(invest)} in investments and valuables could help close the gap. Compare options before deciding.` });
  return { good: good.slice(0, 4), attention: attention.slice(0, 4) };
}

/** "So what?" for each figure: what it means and what healthy looks like. */
export function soWhat(i: AssessmentInput, m: Metrics, fmt: (n: number) => string) {
  const runway = m.monthlySurplus < 0 && i.savings > 0 ? i.savings / -m.monthlySurplus : null;
  return {
    netWorth: `${fmt(m.totalAssets)} owned − ${fmt(m.totalDebts)} owed. ${m.netWorth >= 0 ? "Above zero is good." : "Below zero means you owe more than you own."}`,
    dti: m.monthlyIncome > 0 ? `of your income goes on repayments. Healthy is below 36%; ${m.debtToIncome <= 0.36 ? "you're within it." : m.debtToIncome <= 0.5 ? "you're above it." : "you're well above it."}` : "No income entered.",
    surplus: m.monthlySurplus >= 0 ? "left after costs and repayments. Above zero is good." : `short every month.${runway !== null ? ` Savings last about ${runway.toFixed(1)} months at this rate.` : ""}`,
    safety: `of essential costs covered. Aim for 3–6 months.${runway !== null ? ` With your shortfall, it lasts ${runway.toFixed(1)} months.` : ""}`,
  };
}
