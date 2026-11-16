import type { AssessmentInput, HelpCategory, Metrics } from "./types";
import type { Country } from "./countries";

export const HELP_CATEGORIES: Record<HelpCategory, { label: string; icon: string; what: string; when: string; cost: string }> = {
  budget_adviser: { label: "Budget Adviser", icon: "🧾", what: "Helps you build a realistic budget, find savings and sort out bills.", when: "Money runs out before payday, or you're behind on bills.", cost: "Often free through community financial mentors/counsellors." },
  debt_coach: { label: "Debt Coach", icon: "🎯", what: "Helps you prioritise debts, talk to lenders and stick to a payoff plan.", when: "Several debts, high interest, or collectors calling.", cost: "Free from not-for-profit debt services; avoid companies charging upfront fees." },
  mortgage_adviser: { label: "Mortgage Adviser", icon: "🏠", what: "Compares home-loan rates and structures, refinancing and hardship options.", when: "You have a mortgage, a fixed rate ending, or repayment stress.", cost: "Often free to you (paid by lenders). Ask how they're paid." },
  financial_adviser: { label: "Financial Adviser", icon: "📈", what: "Licensed advice on investing, retirement savings, insurance and property strategy.", when: "Assets to grow or protect, a windfall, or big decisions like selling property.", cost: "Usually fee-based. Check they're licensed." },
  accountant: { label: "Accountant", icon: "🧮", what: "Tax, business and rental-property finances, including tax debt arrangements.", when: "Self-employed, business or tax debt, or rental properties.", cost: "Fee-based. Some community tax help is free." },
  lawyer: { label: "Lawyer / Legal Aid", icon: "⚖️", what: "Rights with collectors, court claims, bankruptcy/insolvency and relationship property.", when: "Court or collection notices, harassment, or considering insolvency.", cost: "Free community legal centres and legal aid exist in every country we cover." },
};

/** Rule-based matching. Returns categories in priority order with a reason. */
export function matchHelp(i: AssessmentInput, m: Metrics): { category: HelpCategory; why: string }[] {
  const out: { category: HelpCategory; why: string; p: number }[] = [];
  const has = (t: string) => i.debts.some(d => d.type === t && d.balance > 0);
  if (i.situation.collectionsOrCourt) out.push({ category: "lawyer", p: 100, why: "You're receiving collection or court notices, and free legal advice can protect your rights." });
  if (m.monthlySurplus < 0 || i.situation.behindOnBills || i.situation.cantAffordFood) out.push({ category: "budget_adviser", p: 95, why: "Your spending is higher than your income or bills are overdue. A free budget adviser can help quickly." });
  if (m.consumerDebts > 0 && (m.debtToIncome > 0.2 || m.highInterestShare > 0.3 || i.debts.filter(d => d.type !== "mortgage").length >= 3)) out.push({ category: "debt_coach", p: 90, why: "You have several or high-interest debts. A debt coach can help you prioritise and negotiate." });
  if (has("mortgage")) out.push({ category: "mortgage_adviser", p: 70, why: "You have a mortgage. A rate or structure review could save money each month." });
  if (has("business") || has("tax") || i.assets.some(a => a.type === "business") || i.assets.filter(a => a.type === "property").length >= 2) out.push({ category: "accountant", p: 65, why: "Business, tax or rental-property finances benefit from an accountant." });
  if (m.totalAssets > 250000 || (m.monthlySurplus > 0 && m.consumerDebts === 0 && m.emergencyMonths >= 3)) out.push({ category: "financial_adviser", p: 50, why: "You have assets or surplus to plan for. Licensed advice can help you grow and protect them." });
  if (!out.length) out.push({ category: "budget_adviser", p: 10, why: "A quick check-in with a budget adviser is a great free first step." });
  return out.sort((a, b) => b.p - a.p).map(({ p: _p, ...r }) => r);
}

export function fallbackBrief(i: AssessmentInput, m: Metrics, c: Country, fmt: (n: number) => string, name?: string | null) {
  const debts = i.debts.filter(d => d.balance > 0).map(d => `• ${d.name}: ${fmt(d.balance)} at ${d.rate}% (min ${fmt(d.minPayment)}/month)`).join("\n") || "• No debts listed";
  const flags = Object.entries(i.situation).filter(([, v]) => v).map(([k]) => k.replace(/([A-Z])/g, " $1").toLowerCase());
  const brief = `REFERRAL BRIEF — ${name || "Client"} (${c.name})
Prepared with DebtFreedomIQ on ${new Date().toLocaleDateString()}

Monthly position
• Take-home income: ${fmt(m.monthlyIncome)}
• Living costs: ${fmt(m.monthlyExpenses)} (essentials ${fmt(m.essentialExpenses)})
• Debt repayments: ${fmt(m.monthlyDebtPayments)} (${(m.debtToIncome * 100).toFixed(0)}% of income)
• Left over: ${fmt(m.monthlySurplus)}

Debts
${debts}

Assets & savings
• Total assets incl. savings: ${fmt(m.totalAssets)} · Savings: ${fmt(i.savings)} (${m.emergencyMonths.toFixed(1)} months of needs)
• Net worth: ${fmt(m.netWorth)}

Situation: ${flags.length ? flags.join(", ") : "no urgent hardship flags"}
Goals: ${i.goals || "Become debt-free and build savings"}

What I'd like help with: understanding my options, a realistic repayment plan, and anything I may be entitled to.`;
  const emailTemplate = `Subject: Request for an appointment — help with my finances

Hello [Name],

I'm looking for help with my finances and would like to book an appointment. I've attached a one-page summary of my situation (income, debts and goals) prepared with DebtFreedomIQ.

Could you let me know:
• whether you can help with my situation,
• what it costs (if anything) and how you are paid,
• your next available appointment.

Thank you,
${name || "[Your name]"}
[Phone] · [Email]`;
  return { brief, emailTemplate };
}

export const CREDITOR_TEMPLATE = (name: string, rightsNote: string) => `Subject: Request for financial hardship assistance — account [number]

Dear Hardship Team,

My circumstances have changed and I'm finding it difficult to keep up with repayments on the account above while covering essential living costs. I want to repay what I owe and would like to agree an arrangement I can keep.

Please consider: reducing or freezing interest and fees for a period; lowering my repayments to an affordable amount; extending the term; or a temporary payment pause.

${rightsNote}

Please confirm any arrangement in writing, including the revised balance and terms.

Yours sincerely,
${name || "[Your name]"}`;

/** Where to find each type of help, per country (free options first). */
export const ACCOUNTANT_BODIES: Record<string, { name: string; url: string }> = {
  NZ: { name: "Chartered Accountants ANZ – find a CA", url: "https://www.charteredaccountantsanz.com" },
  AU: { name: "CPA Australia – find a CPA", url: "https://www.cpaaustralia.com.au" },
  GB: { name: "ICAEW – find a chartered accountant", url: "https://www.icaew.com/about-icaew/find-a-chartered-accountant" },
  US: { name: "IRS VITA – free tax help for lower incomes", url: "https://www.irs.gov/individuals/free-tax-return-preparation-for-qualifying-taxpayers" },
  PH: { name: "PICPA – Philippine Institute of CPAs", url: "https://www.picpa.com.ph" },
};

/** What to search for locally, per country — uses the term people there actually use. */
export const LOCAL_SEARCH: Record<string, Record<HelpCategory, string>> = {
  NZ: { budget_adviser: "financial mentor budgeting service", debt_coach: "budgeting service debt help", mortgage_adviser: "mortgage adviser", financial_adviser: "financial adviser", accountant: "chartered accountant", lawyer: "community law centre" },
  AU: { budget_adviser: "financial counselling service", debt_coach: "financial counsellor", mortgage_adviser: "mortgage broker", financial_adviser: "financial adviser", accountant: "accountant tax agent", lawyer: "community legal centre" },
  GB: { budget_adviser: "Citizens Advice", debt_coach: "free debt advice centre", mortgage_adviser: "mortgage adviser", financial_adviser: "independent financial adviser", accountant: "chartered accountant", lawyer: "law centre legal advice" },
  US: { budget_adviser: "nonprofit credit counseling", debt_coach: "nonprofit credit counseling agency", mortgage_adviser: "HUD approved housing counseling agency", financial_adviser: "fee-only financial planner", accountant: "CPA accountant", lawyer: "legal aid office" },
  PH: { budget_adviser: "DSWD field office", debt_coach: "credit counseling financial literacy", mortgage_adviser: "Pag-IBIG Fund branch", financial_adviser: "licensed financial adviser", accountant: "CPA accounting firm", lawyer: "Public Attorney's Office" },
};

export function mapsSearchUrl(query: string, area?: string | null, country?: string) {
  const q = [query, area ? `near ${area}` : null, country].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}
