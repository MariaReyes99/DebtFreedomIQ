/** "Your financial support team": ranked matches, why (from the person's own numbers), what to expect, and referral readiness. */
import type { AssessmentInput, HelpCategory, Metrics } from "./types";
import type { Solution } from "./solutions";
import { propertiesOf } from "./whatif";

export type TeamMember = {
  category: HelpCategory; priority: "Urgent" | "High" | "Medium" | "Later"; contactBy: string;
  why: string[]; outcomes: string[]; impactMonthly: number; impactOneOff: number; impactFrom: string[];
};
export type Readiness = { items: { id: string; label: string; done: boolean; auto: boolean; href?: string }[] };

const OUTCOMES: Record<HelpCategory, string[]> = {
  budget_adviser: ["A realistic budget you can stick to", "Help talking to lenders and bill providers", "Check of benefits and grants you can get"],
  debt_coach: ["A priority order for your debts", "Hardship or payment arrangements negotiated", "Options like debt consolidation or a formal plan explained"],
  mortgage_adviser: ["Interest-only, longer term or a payment break explored", "Lower rate or refinance options compared", "A written plan to take to your bank"],
  accountant: ["Tax on selling property or investments worked out", "Rental income and expenses checked", "Deductions you may be missing"],
  financial_adviser: ["Which assets to sell or keep, and when", "Retirement plan checked against your numbers", "Investment fees and risk reviewed"],
  lawyer: ["Your rights explained before you sign anything", "Help responding to collectors or court papers", "Options to protect your home"],
};
const IMPACT_FROM: Record<HelpCategory, RegExp> = {
  budget_adviser: /^(trim|insurance|entitlements|hardship|lost-income|boarder|child-support|family-support|student-loan)$/,
  debt_coach: /^(high-interest|hardship)$/,
  mortgage_adviser: /^restructure-/,
  accountant: /^(rent-income|sell)$/,
  financial_adviser: /^(sell-investments|sell-valuables|swap-car)$/,
  lawyer: /^$/,
};

export function buildTeam(i: AssessmentInput, m: Metrics, matches: { category: HelpCategory }[], solutions: Solution[], fmt: (n: number) => string, today = new Date()): TeamMember[] {
  const short = m.monthlySurplus < 0 ? -m.monthlySurplus : 0;
  const runway = short > 0 ? (i.savings > 0 ? i.savings / short : 0) : null;
  const mortgages = i.debts.filter(d => d.type === "mortgage" && d.balance > 0);
  const consumer = i.debts.filter(d => d.type !== "mortgage" && d.balance > 0);
  const hi = consumer.filter(d => d.rate >= 15);
  const props = propertiesOf(i);
  const byDays = (n: number) => new Date(today.getTime() + n * 864e5).toISOString().slice(0, 10);

  return matches.map((x, k) => {
    const why: string[] = [];
    const add = (cond: unknown, s: string) => { if (cond) why.push(s); };
    switch (x.category) {
      case "budget_adviser":
        add(short, `You're short ${fmt(short)} every month`);
        add(runway !== null, runway === 0 ? "You have no savings to cover the gap" : `Your savings last about ${runway!.toFixed(1)} months at this rate`);
        add(i.situation.behindOnBills, "You're behind on bills");
        add(i.situation.cantAffordFood, "You're struggling to afford food");
        add(i.situation.lostIncome, "You've lost your job or income");
        break;
      case "debt_coach":
        add(consumer.length, `${consumer.length} non-mortgage debt${consumer.length > 1 ? "s" : ""} totalling ${fmt(m.consumerDebts)}`);
        add(hi.length, `${hi.length} at 15% interest or more`);
        add(m.debtToIncome > 0.2, `Repayments take ${Math.round(m.debtToIncome * 100)}% of your income`);
        break;
      case "mortgage_adviser":
        add(mortgages.length, `${mortgages.length} mortgage${mortgages.length > 1 ? "s" : ""} totalling ${fmt(mortgages.reduce((t, d) => t + d.balance, 0))}`);
        add(mortgages.length, `Mortgage repayments of ${fmt(mortgages.reduce((t, d) => t + d.minPayment, 0))}/month${m.monthlyIncome > 0 ? ` (${Math.round((mortgages.reduce((t, d) => t + d.minPayment, 0) / m.monthlyIncome) * 100)}% of income)` : ""}`);
        add(short, "Restructuring could ease your monthly gap quickly");
        break;
      case "accountant":
        add(props.length >= 2, `${props.length} properties, including ${props.filter(p => p.use === "rental").length || "a"} rental`);
        add(i.assets.some(a => a.type === "business"), "You own a business");
        add(i.debts.some(d => d.type === "tax" && d.balance > 0), "You owe tax");
        add(solutions.some(s => s.id === "sell" || s.id === "sell-investments"), "Selling an asset may have tax to plan for");
        break;
      case "financial_adviser":
        add(m.totalAssets > 0, `${fmt(m.totalAssets)} in assets to protect`);
        add(i.assets.some(a => a.type === "investments" && a.value > 0), `Investments of ${fmt(i.assets.filter(a => a.type === "investments").reduce((t, a) => t + a.value, 0))}`);
        add(i.age && i.age >= 50, `You're ${i.age}: retirement decisions matter now`);
        break;
      case "lawyer":
        add(i.situation.collectionsOrCourt, "You've had collection or court notices");
        add(mortgages.length && short, "Your home could be at risk if repayments are missed");
        break;
    }
    if (!why.length) why.push("A good free first check for your situation");
    const rel = solutions.filter(s => IMPACT_FROM[x.category].test(s.id) && s.kind !== "fix");
    const urgent = (x.category === "budget_adviser" && short && (runway ?? 99) < 3) || (x.category === "lawyer" && i.situation.collectionsOrCourt);
    const priority: TeamMember["priority"] = urgent ? "Urgent" : k === 0 || (short && ["budget_adviser", "mortgage_adviser", "debt_coach"].includes(x.category)) ? "High" : k < 3 ? "Medium" : "Later";
    return {
      category: x.category, priority, contactBy: byDays(priority === "Urgent" ? 2 : priority === "High" ? 7 : priority === "Medium" ? 21 : 45),
      why: why.slice(0, 4), outcomes: OUTCOMES[x.category],
      impactMonthly: Math.round(rel.reduce((t, s) => t + s.monthly, 0)), impactOneOff: Math.round(rel.reduce((t, s) => t + (s.oneOff ?? 0), 0)), impactFrom: rel.map(s => s.title),
    };
  }).sort((a, b) => ["Urgent", "High", "Medium", "Later"].indexOf(a.priority) - ["Urgent", "High", "Medium", "Later"].indexOf(b.priority));
}

export function readiness(i: AssessmentInput, hasPlan: boolean): Readiness {
  return { items: [
    { id: "check", label: "Financial Health check done", done: true, auto: true },
    { id: "income", label: "Income entered", done: i.incomes.some(x => x.amount > 0), auto: true, href: "/health?edit=1" },
    { id: "costs", label: "Living costs entered", done: i.expenses.some(x => x.amount > 0), auto: true, href: "/health?edit=1" },
    { id: "debts", label: "Every debt with its rate and repayment", done: i.debts.length > 0 && i.debts.every(d => d.balance > 0 && d.minPayment > 0 && d.rate > 0), auto: true, href: "/health?edit=1" },
    { id: "plan", label: "Freedom Plan saved", done: hasPlan, auto: true, href: "/plan" },
    { id: "statements", label: "Last 3 months of bank statements", done: false, auto: false },
    { id: "loans", label: "Latest statement for each loan or card", done: false, auto: false },
    { id: "letters", label: "Any letters from lenders, collectors or courts", done: false, auto: false },
    { id: "id", label: "Photo ID", done: false, auto: false },
  ] };
}
