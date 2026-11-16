import "server-only";
import { buildScenarios, fmtMonths, type ScenarioResult, type Strategy } from "./plan";
import { aiPlanSummary, type PlanSummary } from "./ai";
import { COUNTRIES, DEFAULT_COUNTRY, toCountryCode, money } from "./countries";
import type { AssessmentInput, Metrics, Goal } from "./types";

export type PlanPayload = { scenarios: ScenarioResult[]; summary: PlanSummary & { source: "openai" | "rules" }; strategy: Strategy };

export function scenariosFor(input: AssessmentInput, m: Metrics, strategy: Strategy) {
  return buildScenarios({ debts: input.debts, surplus: m.monthlySurplus, savings: input.savings, monthlyNeeds: m.essentialExpenses + m.monthlyDebtPayments, strategy });
}

export function ruleSummary(input: AssessmentInput, m: Metrics, sc: ScenarioResult[]): PlanSummary {
  const c = COUNTRIES[toCountryCode(input.country) ?? DEFAULT_COUNTRY];
  const crisis = m.monthlySurplus <= 0 || input.situation.cantAffordFood || input.situation.housingAtRisk || m.emergencyMonths < 0.5;
  const pick = crisis ? "conservative" : m.emergencyMonths >= 3 && m.highInterestShare > 0 ? "aggressive" : "balanced";
  const s = sc.find(x => x.key === pick)!;
  const headline = m.consumerDebts > 0
    ? `With the ${s.label} plan you could be consumer-debt-free in ${fmtMonths(s.consumerDebtFreeMonth)}.`
    : s.mortgageFreeMonth !== null ? `You're free of consumer debt. The ${s.label} plan could clear your mortgage in ${fmtMonths(s.mortgageFreeMonth)}.` : `You're debt-free. Focus on building savings and investing.`;
  const why = crisis
    ? "Your budget is tight, so a buffer comes first. Building savings stops new debt while you pay down what you owe."
    : pick === "aggressive" ? "You already have a solid emergency fund, so putting most of your surplus on high-interest debt saves the most money."
    : "Splitting your surplus between debt and savings gives steady progress without leaving you exposed to surprise bills.";
  const tips = [
    `Put windfalls (tax refunds, bonuses, gifts) straight onto your highest-interest debt. Every ${money(c, 1000)} saves roughly ${money(c, 1000 * (Math.max(...input.debts.map(d => d.rate), 0) / 100))} a year in interest.`,
    "Ask each lender for a lower rate. A 5-minute phone call can save hundreds.",
    m.monthlySurplus > 0 ? `Automate your ${money(c, s.monthlyToDebt)}/month extra payment on payday so it happens before you can spend it.` : "Close the monthly gap first: check entitlements, pause non-essentials and ask lenders about hardship arrangements.",
    ...(input.debts.some(d => d.type === "mortgage") ? ["When your fixed mortgage rate ends, compare rates and consider keeping repayments at the higher level to pay it off faster."] : []),
  ].slice(0, 4);
  return { headline, recommendedScenario: pick, why, tips };
}

export async function makePlan(input: AssessmentInput, m: Metrics, strategy: Strategy): Promise<PlanPayload> {
  const scenarios = scenariosFor(input, m, strategy);
  const c = COUNTRIES[toCountryCode(input.country) ?? DEFAULT_COUNTRY];
  const ai = await aiPlanSummary(input, m, c, scenarios);
  const summary = ai ? { ...ai, source: "openai" as const } : { ...ruleSummary(input, m, scenarios), source: "rules" as const };
  return { scenarios, summary, strategy };
}

export function defaultGoals(input: AssessmentInput, m: Metrics, sc: ScenarioResult[]): Goal[] {
  const bal = sc.find(s => s.key === "balanced")!;
  const goals: Goal[] = [{ id: "g-emergency", title: "Emergency fund", target: bal.emergencyTarget, current: input.savings }];
  const top = [...input.debts].filter(d => d.type !== "mortgage" && d.balance > 0).sort((a, b) => b.rate - a.rate)[0];
  if (top) goals.push({ id: "g-top", title: `Pay off ${top.name}`, target: top.balance, current: 0 });
  if (m.consumerDebts > 0) goals.push({ id: "g-consumer", title: "Clear all consumer debt", target: m.consumerDebts, current: 0 });
  return goals;
}
