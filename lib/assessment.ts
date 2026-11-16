import "server-only";
import { calculate, ruleAdvice } from "./finance";
import { aiAdvice } from "./ai";
import { COUNTRIES, DEFAULT_COUNTRY, money, toCountryCode, type Country } from "./countries";
import { createClient } from "./supabase/server";
import type { AssessmentInput, Advice, Metrics, DebtType, AssetType } from "./types";

const DEBT_TYPES: DebtType[] = ["mortgage", "credit_card", "personal_loan", "car_loan", "bnpl", "student_loan", "medical", "tax", "business", "family", "other"];
const ASSET_TYPES: AssetType[] = ["property", "vehicle", "investments", "retirement", "business", "other"];
const n = (v: unknown, max = 1e10) => Math.min(max, Math.max(0, Number(v) || 0));
const str = (v: unknown, len = 80) => String(v ?? "").slice(0, len);
const id = () => Math.random().toString(36).slice(2, 10);

/** Validate + clamp untrusted input from the browser. */
export function sanitize(raw: unknown): AssessmentInput {
  const r = (raw ?? {}) as Partial<AssessmentInput>;
  const s = (r.situation ?? {}) as Partial<AssessmentInput["situation"]>;
  return {
    country: toCountryCode(r.country) ?? DEFAULT_COUNTRY,
    incomes: (r.incomes ?? []).slice(0, 20).map(x => ({ id: str(x.id, 20) || id(), source: str(x.source) || "Income", amount: n(x.amount) })),
    expenses: (r.expenses ?? []).slice(0, 40).map(x => ({ id: str(x.id, 20) || id(), category: str(x.category) || "Expense", amount: n(x.amount), essential: Boolean(x.essential) })),
    debts: (r.debts ?? []).slice(0, 30).map(x => ({ id: str(x.id, 20) || id(), name: str(x.name) || "Debt", type: DEBT_TYPES.includes(x.type as DebtType) ? x.type as DebtType : "other", balance: n(x.balance), rate: n(x.rate, 1000), minPayment: n(x.minPayment) })),
    assets: (r.assets ?? []).slice(0, 30).map(x => ({ id: str(x.id, 20) || id(), name: str(x.name) || "Asset", type: ASSET_TYPES.includes(x.type as AssetType) ? x.type as AssetType : "other", value: n(x.value) })),
    savings: n(r.savings),
    situation: { behindOnBills: !!s.behindOnBills, collectionsOrCourt: !!s.collectionsOrCourt, cantAffordFood: !!s.cantAffordFood, housingAtRisk: !!s.housingAtRisk, medicalDebt: !!s.medicalDebt, distressed: !!s.distressed },
    goals: str(r.goals, 600),
  };
}

export const fmtFor = (c: Country) => (v: number) => money(c, v);

export async function evaluate(input: AssessmentInput): Promise<{ metrics: Metrics; advice: Advice; country: Country }> {
  const country = COUNTRIES[toCountryCode(input.country) ?? DEFAULT_COUNTRY];
  const metrics = calculate(input);
  const advice = (await aiAdvice(input, metrics, country)) ?? ruleAdvice(input, metrics, fmtFor(country));
  return { metrics, advice, country };
}

export async function saveAssessment(userId: string, input: AssessmentInput, metrics: Metrics, advice: Advice, country: Country) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("financial_assessments").insert({
    user_id: userId, country: country.code, currency: country.currency,
    monthly_income: metrics.monthlyIncome, monthly_expenses: metrics.monthlyExpenses, monthly_debt_payments: metrics.monthlyDebtPayments,
    savings: input.savings, total_assets: metrics.totalAssets, total_debts: metrics.totalDebts, net_worth: metrics.netWorth,
    debt_to_income: metrics.debtToIncome, health_score: metrics.healthScore, stress_score: metrics.stressScore,
    emergency_score: metrics.emergencyScore, emergency_months: metrics.emergencyMonths,
    situation: input.situation, goals: input.goals || null,
    recommendations: { summary: advice.summary, recommendations: advice.recommendations, nextSteps: advice.nextSteps, incomes: input.incomes },
    ai_source: advice.source,
  }).select("id").single();
  if (error || !data) { console.error("saveAssessment", error); return null; }
  const aid = data.id as string;
  await Promise.all([
    input.debts.length && supabase.from("debts").insert(input.debts.map(d => ({ user_id: userId, assessment_id: aid, name: d.name, type: d.type, balance: d.balance, interest_rate: d.rate, min_payment: d.minPayment }))),
    input.assets.length && supabase.from("assets").insert(input.assets.map(a => ({ user_id: userId, assessment_id: aid, name: a.name, type: a.type, value: a.value }))),
    input.expenses.length && supabase.from("expenses").insert(input.expenses.map(e => ({ user_id: userId, assessment_id: aid, category: e.category, amount: e.amount, essential: e.essential }))),
  ]);
  return aid;
}

/** Rebuild the latest saved assessment for a user (used by Find Help, Plan, Dashboard). */
export async function loadLatest(userId: string) {
  const supabase = await createClient();
  const { data: a } = await supabase.from("financial_assessments").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!a) return null;
  const [{ data: debts }, { data: assets }, { data: expenses }] = await Promise.all([
    supabase.from("debts").select("*").eq("assessment_id", a.id),
    supabase.from("assets").select("*").eq("assessment_id", a.id),
    supabase.from("expenses").select("*").eq("assessment_id", a.id),
  ]);
  const rec = (a.recommendations ?? {}) as { summary?: string; recommendations?: Advice["recommendations"]; nextSteps?: string[]; incomes?: AssessmentInput["incomes"] };
  const input: AssessmentInput = {
    country: a.country ?? DEFAULT_COUNTRY,
    incomes: rec.incomes?.length ? rec.incomes : [{ id: "i1", source: "Income", amount: Number(a.monthly_income) }],
    expenses: (expenses ?? []).map(e => ({ id: e.id, category: e.category, amount: Number(e.amount), essential: e.essential })),
    debts: (debts ?? []).map(d => ({ id: d.id, name: d.name, type: d.type, balance: Number(d.balance), rate: Number(d.interest_rate), minPayment: Number(d.min_payment) })),
    assets: (assets ?? []).map(x => ({ id: x.id, name: x.name, type: x.type, value: Number(x.value) })),
    savings: Number(a.savings), situation: a.situation, goals: a.goals ?? "",
  };
  const advice: Advice = { summary: rec.summary ?? "", recommendations: rec.recommendations ?? [], nextSteps: rec.nextSteps ?? [], source: a.ai_source === "openai" ? "openai" : "rules" };
  return { id: a.id as string, createdAt: a.created_at as string, input, metrics: calculate(input), advice };
}
