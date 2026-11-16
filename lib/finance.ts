import type { AssessmentInput, Metrics, Recommendation, Advice, DebtItem } from "./types";

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
  if (s.behindOnBills) health -= 8;
  if (s.collectionsOrCourt) health -= 12;
  if (s.cantAffordFood || s.housingAtRisk) health -= 10;
  const healthScore = Math.round(clamp(health));

  // Stress (higher = more stress)
  let stress = (100 - sSavings) * 0.3 + (100 - sDti) * 0.25 + (100 - emergencyScore) * 0.2 + highInterestShare * 100 * 0.1;
  if (monthlySurplus < 0) stress += 10;
  if (s.behindOnBills) stress += 8;
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

const highestRate = (debts: DebtItem[]) => [...debts].filter(d => d.type !== "mortgage" && d.balance > 0).sort((a, b) => b.rate - a.rate)[0];

/** Deterministic recommendations — used when OpenAI isn't configured, and as a safety net. */
export function ruleAdvice(i: AssessmentInput, m: Metrics, fmt: (n: number) => string): Advice {
  const recs: (Recommendation & { p: number })[] = [];
  const s = i.situation;
  if (s.cantAffordFood || s.housingAtRisk)
    recs.push({ p: 100, impact: "high", category: "Essentials", title: "Protect food, housing and power first", detail: "Debt repayments come after essentials. Contact the free services in Find Help today about food grants, rent arrears and hardship payments." });
  if (s.collectionsOrCourt)
    recs.push({ p: 95, impact: "high", category: "Legal", title: "Respond to collection or court notices now", detail: "Don't ignore them. Get free legal advice quickly. You may have rights you don't know about, and deadlines matter." });
  if (m.monthlySurplus < 0)
    recs.push({ p: 90, impact: "high", category: "Cash flow", title: `Close your ${fmt(-m.monthlySurplus)}/month gap`, detail: "You're spending more than comes in. Ask lenders for hardship arrangements, check government entitlements, and pause non-essential spending until the gap is closed." });
  const top = highestRate(i.debts);
  if (top && top.rate >= 15)
    recs.push({ p: 80, impact: "high", category: "Debt", title: `Target ${top.name} first (${top.rate}% interest)`, detail: `Pay minimums on everything else and put any extra money on ${top.name}. Paying off the highest-interest debt first saves the most money.` });
  if (m.emergencyMonths < 1)
    recs.push({ p: 75, impact: "high", category: "Savings", title: `Build a starter emergency fund of ${fmt(Math.max(500, Math.round(m.essentialExpenses * 0.5 / 100) * 100))}`, detail: "A small buffer stops the next surprise bill from going on a credit card or loan." });
  else if (m.emergencyMonths < 3)
    recs.push({ p: 50, impact: "medium", category: "Savings", title: `Grow your emergency fund to 3 months (${fmt(Math.round((m.essentialExpenses + m.monthlyDebtPayments) * 3))})`, detail: "Automate a fixed amount into a separate savings account each payday." });
  if (m.debtToIncome > 0.36)
    recs.push({ p: 70, impact: "high", category: "Debt", title: "Reduce your debt-to-income ratio", detail: `Debt repayments take ${(m.debtToIncome * 100).toFixed(0)}% of your income (aim for under 36%). Avoid new credit and ask about lower rates or longer terms.` });
  const bnpl = i.debts.filter(d => d.type === "bnpl" && d.balance > 0);
  if (bnpl.length)
    recs.push({ p: 60, impact: "medium", category: "Debt", title: "Stop using buy-now-pay-later", detail: "Clear existing BNPL plans and remove saved cards. Missed BNPL payments add fees and can affect your credit." });
  if (s.medicalDebt)
    recs.push({ p: 65, impact: "medium", category: "Health costs", title: "Ask about help with medical bills", detail: "Hospitals and health services often have hardship, payment-plan or charity-care options. Check Find Help before paying or borrowing." });
  const mortgage = i.debts.find(d => d.type === "mortgage" && d.balance > 0);
  if (mortgage && m.monthlySurplus > 0 && !(top && top.rate >= 15))
    recs.push({ p: 45, impact: "medium", category: "Mortgage", title: "Review your mortgage rate and structure", detail: "A rate review, offset or extra repayments can save thousands. A mortgage adviser can compare options for free in many countries." });
  const nonEssential = i.expenses.filter(e => !e.essential).reduce((a, e) => a + e.amount, 0);
  if (nonEssential > m.monthlyIncome * 0.15)
    recs.push({ p: 40, impact: "medium", category: "Spending", title: `Trim non-essential spending (${fmt(nonEssential)}/month)`, detail: "Cutting it by a quarter frees money for debt and savings. Start with subscriptions you don't use." });
  if (m.monthlySurplus > 0 && m.emergencyMonths >= 3 && m.consumerDebts === 0)
    recs.push({ p: 30, impact: "medium", category: "Growth", title: "Start investing your surplus", detail: "With no consumer debt and a solid buffer, consider long-term investing or extra retirement contributions. A licensed adviser can help." });
  recs.push({ p: 10, impact: "low", category: "Habits", title: "Review your money every fortnight", detail: "Ten minutes every payday keeps you on track. Re-do your Financial Health check each month to see your progress." });

  const recommendations = recs.sort((a, b) => b.p - a.p).slice(0, 5).map(({ p: _p, ...r }) => r);
  const summary = `Your Financial Health Score is ${m.healthScore}/100 (${m.healthBand}) and your stress level is ${m.stressBand.toLowerCase()}. ` +
    (m.monthlySurplus >= 0 ? `You have about ${fmt(m.monthlySurplus)} left each month after bills and repayments.` : `You're short about ${fmt(-m.monthlySurplus)} each month.`);
  const nextSteps = [
    recommendations[0] ? recommendations[0].title : "Review your results",
    "List every debt with its exact balance and interest rate",
    m.monthlySurplus < 0 || isCrisis(i, m) ? "Contact a free financial mentor/counsellor in Find Help this week" : "Set up an automatic transfer to savings on payday",
  ];
  return { summary, recommendations, nextSteps, source: "rules" };
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
  const noMin = i.debts.filter(d => d.balance > 0 && d.minPayment === 0 && d.type !== "family");
  if (noMin.length) w.push({ step: 2, message: `Add the monthly repayment for ${noMin.map(d => `"${d.name}"`).join(", ")}, otherwise we can't plan the payoff.` });
  return w;
}
