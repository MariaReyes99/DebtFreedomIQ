export type Flags = {
  cantAffordFood: boolean;
  housingAtRisk: boolean;
  courtOrCollection: boolean;
  behindOnBills: boolean;
  creditForEssentials: boolean;
  distressed: boolean;
  medicalDebt?: boolean;
};

export type CheckInput = {
  income: number;
  essentials: number; // rent/mortgage, food, power, transport, health, childcare
  debtRepayments: number;
  other: number;
  totalDebt: number;
  flags: Flags;
};

export type CheckResult = {
  level: "green" | "amber" | "red";
  balance: number;
  debtRatio: number; // repayments / income
  reasons: string[];
};

export function assess(i: CheckInput): CheckResult {
  const balance = i.income - i.essentials - i.debtRepayments - i.other;
  const debtRatio = i.income > 0 ? i.debtRepayments / i.income : i.debtRepayments > 0 ? 1 : 0;
  const red: string[] = [];
  const amber: string[] = [];

  if (i.flags.cantAffordFood) red.push("You can't always afford food");
  if (i.flags.housingAtRisk) red.push("Your housing is at risk");
  if (i.flags.courtOrCollection) red.push("You're receiving debt collection or court notices");
  if (i.flags.distressed) red.push("You're feeling very distressed or alone");
  if (i.income < i.essentials) red.push("Your income doesn't cover essential living costs");

  if (balance < 0) amber.push("You're spending more than comes in each period");
  else if (i.income > 0 && balance < i.income * 0.05) amber.push("There's little or nothing left before payday");
  if (i.flags.behindOnBills) amber.push("Some bills or repayments are overdue");
  if (i.flags.creditForEssentials) amber.push("You're using credit to pay for everyday costs");
  if (debtRatio > 0.3) amber.push("Debt repayments take more than 30% of your income");
  if (i.flags.medicalDebt) amber.push("Health or hospital costs are adding to your bills. There is specific help for this");

  if (red.length) return { level: "red", balance, debtRatio, reasons: [...red, ...amber] };
  if (amber.length) return { level: "amber", balance, debtRatio, reasons: amber };
  return { level: "green", balance, debtRatio, reasons: ["Essentials are covered and repayments are manageable"] };
}

export const LEVEL_COPY = {
  green: { label: "Manageable", action: "Build a small emergency fund, review your debts and keep a buffer so a surprise bill doesn't knock you back." },
  amber: { label: "Under pressure", action: "Talk to a free money adviser this week, check what government support you can get, and ask creditors about hardship arrangements before you miss more payments." },
  red: { label: "Urgent hardship", action: "Protect food, housing and power first — debt repayments come after. Contact the free services below today. You do not have to sort this out alone." },
} as const;
