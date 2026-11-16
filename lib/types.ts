export type DebtType =
  | "mortgage" | "credit_card" | "personal_loan" | "car_loan" | "bnpl" | "student_loan"
  | "medical" | "tax" | "child_support" | "business" | "family" | "other";
export type AssetType = "property" | "vehicle" | "investments" | "retirement" | "business" | "other";

export type IncomeItem = { id: string; source: string; amount: number }; // per month
export type ExpenseItem = { id: string; category: string; amount: number; essential: boolean }; // per month
export type DebtItem = { id: string; name: string; type: DebtType; balance: number; rate: number; minPayment: number };
export type PropertyUse = "home" | "rental" | "other";
export type AssetItem = { id: string; name: string; type: AssetType; value: number; use?: PropertyUse }; // use: only for property

export type Situation = {
  behindOnBills: boolean;
  collectionsOrCourt: boolean;
  cantAffordFood: boolean;
  housingAtRisk: boolean;
  medicalDebt: boolean;
  distressed: boolean;
};

export type AssessmentInput = {
  country: string;
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  debts: DebtItem[];
  assets: AssetItem[];
  savings: number; // cash / emergency savings
  situation: Situation;
  goals: string;
};

export type Metrics = {
  monthlyIncome: number;
  monthlyExpenses: number;
  essentialExpenses: number;
  monthlyDebtPayments: number;
  monthlySurplus: number;
  totalAssets: number; // includes savings
  totalDebts: number;
  consumerDebts: number; // excludes mortgage
  netWorth: number;
  debtToIncome: number; // monthly debt payments ÷ monthly income
  savingsRate: number;
  emergencyMonths: number;
  highInterestShare: number; // share of consumer debt at ≥15% p.a.
  healthScore: number; // 0–100 (higher = healthier)
  stressScore: number; // 0–100 (higher = more stress)
  emergencyScore: number; // 0–100
  healthBand: "Excellent" | "Good" | "Fair" | "At risk" | "Critical";
  stressBand: "Low" | "Moderate" | "High" | "Severe";
};

export type Recommendation = { title: string; detail: string; impact: "high" | "medium" | "low"; category: string };
export type Advice = { summary: string; recommendations: Recommendation[]; nextSteps: string[]; source: "openai" | "rules" };

export type HelpCategory = "financial_adviser" | "mortgage_adviser" | "debt_coach" | "budget_adviser" | "accountant" | "lawyer";

export type Goal = { id: string; title: string; target: number; current: number; due?: string };
