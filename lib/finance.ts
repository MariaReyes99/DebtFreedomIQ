import type { AssessmentInput, Metrics, Recommendation, Advice } from "./types";
import type { Country } from "./countries";
import { buildSolutions } from "./solutions";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const lerp = (x: number, x0: number, x1: number) => clamp(((x - x0) / (x1 - x0)) * 100); // 0 at x0 → 100 at x1
const sum = (xs: number[]) => xs.reduce((s, x) => s + (Number(x) || 0), 0);

export function calculate(i: AssessmentInput): Metrics {
  const monthlyIncome = sum(i.incomes.map(x => x.amount));
  const monthlyExpenses = sum(i.expenses.map(x => x.amount));
  const essentialExpenses = sum(i.expenses.filter(x => x.essential).map(x => x.amount));
  const monthlyDebtPayments = sum(i.debts.map(d => d.minPayment));
  const monthlySurplus = monthlyIncome - monthlyExpenses - monthlyDebtPayments;
  const totalAssets = sum(i.assets.map(a => a.value)) + (i.savings || 0);
  const totalDebts = sum(i.debts.map(d => d.balance));
  const consumer = i.debts.filter(d => d.type !== "mortgage");
  const consumerDebts = sum(consumer.map(d => d.balance));
  const netWorth = totalAssets - totalDebts;
  const debtToIncome = monthlyIncome > 0 ? monthlyDebtPayments / monthlyIncome : monthlyDebtPayments > 0 ? 1 : 0;
  const savingsRate = monthlyIncome > 0 ? monthlySurplus / monthlyIncome : monthlySurplus < 0 ? -1 : 0;
  const monthlyNeeds = essentialExpenses + monthlyDebtPayments;
  const emergencyMonths = monthlyNeeds > 0 ? (i.savings || 0) / monthlyNeeds : (i.savings || 0) > 0 ? 12 : 0;
  const highInterestShare = consumerDebts > 0 ? sum(consumer.filter(d => d.rate >= 15).map(d => d.balance)) / consumerDebts : 0;
  const leverage = totalAssets > 0 ? totalDebts / totalAssets : totalDebts > 0 ? 2 : 0;

  // Component scores (0–100, higher = healthier)
  const sDti = 100 - lerp(debtToIncome, 0.1, 0.5);
  const sSavings = lerp(savingsRate, -0.1, 0.2);
  const emergencyScore = Math.round(lerp(emergencyMonths, 0, 6));
  const sLeverage = totalAssets === 0 && totalDebts === 0 ? 70 : 100 - lerp(leverage, 0.3, 1.2);
  const sHighInterest = 100 - highInterestShare * 100;

  let health = sDti * 0.3 + sSavings * 0.2 + emergencyScore * 0.2 + sLeverage * 0.15 + sHighInterest * 0.15;
  const s = i.situation;
  if (s.behindOnBills || s.disconnection) health -= 8;
  if (s.collectionsOrCourt) health -= 12;
  if (s.cantAffordFood || s.housingAtRisk) health -= 10;
  const healthScore = Math.round(clamp(health));

  // Stress (higher = more stress)
  let stress = (100 - sSavings) * 0.3 + (100 - sDti) * 0.25 + (100 - emergencyScore) * 0.2 + highInterestShare * 100 * 0.1;
  if (monthlySurplus < 0) stress += 10;
  if (s.behindOnBills || s.disconnection) stress += 8;
  if (s.lostIncome) stress += 8;
  if (s.collectionsOrCourt) stress += 12;
  if (s.cantAffordFood) stress += 15;
  if (s.housingAtRisk) stress += 15;
  if (s.medicalDebt) stress += 5;
  if (s.distressed) stress += 10;
  const stressScore = Math.round(clamp(stress));

  return {
    monthlyIncome, monthlyExpenses, essentialExpenses, monthlyDebtPayments, monthlySurplus,
    totalAssets, totalDebts, consumerDebts, netWorth, debtToIncome, savingsRate, emergencyMonths, highInterestShare,
    healthScore, stressScore, emergencyScore,
    healthBand: healthScore >= 80 ? "Excellent" : healthScore >= 65 ? "Good" : healthScore >= 45 ? "Fair" : healthScore >= 25 ? "At risk" : "Critical",
    stressBand: stressScore >= 75 ? "Severe" : stressScore >= 50 ? "High" : stressScore >= 25 ? "Moderate" : "Low",
  };
}

export function isCrisis(i: AssessmentInput, m: Metrics) {
  const s = i.situation;
  return s.cantAffordFood || s.housingAtRisk || s.distressed || m.monthlyIncome < m.essentialExpenses || m.stressScore >= 75;
}


/** Deterministic recommendations — used when OpenAI isn't configured, and as a safety net. */
export function ruleAdvice(i: AssessmentInput, m: Metrics, fmt: (n: number) => string, c: Country): Advice {
  const recs: Recommendation[] = [];
  const s = i.situation;
  const gap = Math.max(0, -m.monthlySurplus);
  if (s.cantAffordFood || s.housingAtRisk)
    recs.push({ impact: "high", category: "Essentials", title: "Protect food, housing and power first", detail: `Debt repayments come after essentials. Today, contact ${c.firstCall.name}${c.firstCall.phone ? ` (${c.firstCall.phone})` : ""} about food grants, arrears and hardship payments.` });
  if (s.collectionsOrCourt)
    recs.push({ impact: "high", category: "Legal", title: "Respond to collection or court notices now", detail: "Don't ignore them. Get free legal advice this week. Deadlines matter, and you may have rights you don't know about." });

  // Concrete options with estimated monthly impact
  const all = buildSolutions(i, m, c, fmt);
  const lost = all.find(o => o.id === "lost-income");
  if (lost) recs.unshift({ impact: "high", category: "Income", title: lost.title, detail: lost.detail });
  const options = all.filter(o => o.kind !== "fix" && o.id !== "lost-income");
  for (const o of options) {
    if (recs.length >= 5) break;
    const impact: Recommendation["impact"] = o.monthly >= Math.max(200, gap * 0.15) ? "high" : o.monthly > 0 ? "medium" : "medium";
    recs.push({ impact, category: o.kind, title: o.title, detail: o.caution ? `${o.detail} ⚠️ ${o.caution}` : o.detail });
  }
  if (recs.length < 5 && m.emergencyMonths < 3)
    recs.push({ impact: "medium", category: "Savings", title: `Build an emergency fund of ${fmt(Math.round((m.essentialExpenses + m.monthlyDebtPayments) * 3 / 100) * 100)}`, detail: "Three months of essential costs stops the next surprise bill from becoming new debt. Automate a transfer each payday." });
  if (recs.length < 5) recs.push({ impact: "low", category: "Habits", title: "Review your money every fortnight", detail: "Ten minutes each payday keeps you on track. Redo your Financial Health check monthly to see progress." });

  const totalOptions = options.reduce((a, o) => a + o.monthly, 0);
  const summary = `Your Financial Health Score is ${m.healthScore}/100 (${m.healthBand}) and your stress level is ${m.stressBand.toLowerCase()}. ` +
    (m.monthlySurplus >= 0
      ? `You have about ${fmt(m.monthlySurplus)} left each month after bills and repayments.`
      : `You're short about ${fmt(gap)} each month. We found options worth up to about ${fmt(totalOptions)}/month. See "Ways to close your gap" below.`);
  const nextSteps = [
    recs[0]?.title ?? "Review your results",
    options.find(o => o.kind === "debt")?.title.replace(/:.*/, "") ?? "List every debt with its exact balance and interest rate",
    m.monthlySurplus < 0 || isCrisis(i, m) ? `Call ${c.firstCall.name}${c.firstCall.phone ? ` on ${c.firstCall.phone}` : ""} (free) this week` : "Set up an automatic transfer to savings on payday",
  ];
  return { summary, recommendations: recs.slice(0, 5), nextSteps, source: "rules" };
}

export type DataWarning = { message: string; step: number }; // step = wizard step to fix it (0 income … 3 assets)
const looksLikeProperty = (s: string) => /house|home|mortgage|property|unit|flat|apartment|rental/i.test(s);

/** Sanity checks for common data-entry gaps (shown before and after calculating). */
export function dataWarnings(i: AssessmentInput, m: Metrics, fmt: (n: number) => string): DataWarning[] {
  const w: DataWarning[] = [];
  const mortgages = i.debts.filter(d => d.balance > 0 && (d.type === "mortgage" || looksLikeProperty(d.name)));
  const properties = i.assets.filter(a => a.type === "property" && a.value > 0);
  if (m.monthlyIncome <= 0) w.push({ step: 0, message: "You haven't entered any income yet." });
  if (mortgages.length > properties.length)
    w.push({ step: 3, message: `You've added ${mortgages.length} home loan${mortgages.length > 1 ? "s" : ""} but ${properties.length ? `only ${properties.length} property` : "no property value"}. Add each property's value under Assets, or your net worth will look much lower than it is.` });
  const misTyped = i.debts.filter(d => d.balance > 0 && d.type !== "mortgage" && looksLikeProperty(d.name));
  if (misTyped.length) w.push({ step: 2, message: `${misTyped.map(d => `"${d.name}"`).join(", ")} look${misTyped.length === 1 ? "s" : ""} like a home loan. Set the type to "Mortgage / home loan".` });
  if (mortgages.length >= 2 && !i.incomes.some(x => /rent/i.test(x.source) && x.amount > 0))
    w.push({ step: 0, message: "You have more than one property loan. If any property is rented out, add the rent under Income." });
  if (m.monthlyIncome > 0 && m.monthlyDebtPayments > m.monthlyIncome)
    w.push({ step: 2, message: `Your debt repayments (${fmt(m.monthlyDebtPayments)}/month) are more than your income (${fmt(m.monthlyIncome)}/month). Check every amount is per month (not per year or fortnight), and that all income is included.` });
  const big = i.expenses.filter(e => m.monthlyIncome > 0 && e.amount > m.monthlyIncome * 0.6);
  if (big.length) w.push({ step: 1, message: `${big.map(e => `"${e.category}"`).join(", ")} ${big.length === 1 ? "is" : "are"} very large for one month. Is that a yearly amount? Divide yearly bills by 12.` });
  const rentRow = i.expenses.find(e => /rent|board/i.test(e.category) && e.amount > 0);
  if (rentRow && mortgages.length) w.push({ step: 1, message: `You entered "${rentRow.category}" (${fmt(rentRow.amount)}) and also have a home loan. If you own the home you live in, remove the rent. It may be counted twice.` });
  const noMin = i.debts.filter(d => d.balance > 0 && d.minPayment === 0 && d.type !== "family");
  if (noMin.length) w.push({ step: 2, message: `Add the monthly repayment for ${noMin.map(d => `"${d.name}"`).join(", ")}, otherwise we can't plan the payoff.` });
  return w;
}
