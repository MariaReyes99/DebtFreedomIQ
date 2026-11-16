import OpenAI from "openai";
import type { Advice, AssessmentInput, Metrics, HelpCategory } from "./types";
import type { ScenarioResult } from "./plan";
import type { Country } from "./countries";
import { buildSolutions } from "./solutions";
import { money } from "./countries";

/**
 * All AI calls go through here. If OPENAI_API_KEY is missing, or a call fails,
 * callers get `null` and fall back to the deterministic rule engine.
 */
const MODEL = process.env.OPENAI_MODEL || "gpt-5.6-terra";
export const aiEnabled = () => Boolean(process.env.OPENAI_API_KEY);
let client: OpenAI | null = null;
const ai = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

const GUARDRAILS = `You are DebtFreedomIQ, a calm, non-judgemental financial guidance assistant.
Rules:
- Give general information and education, not regulated financial, legal or tax advice. Never tell someone to buy, sell or take out a specific financial product, lender or investment.
- Never recommend payday loans, debt-settlement companies that charge upfront fees, or borrowing to pay other debts unless it is a free/no-interest community scheme.
- Put essentials (food, housing, power, medicine, children) before debt repayments.
- If the person shows signs of crisis (can't afford food, housing at risk, very distressed), lead with free help and kindness.
- Use plain English (reading age ~12), short sentences, the person's currency, and country-specific terms where you know them.
- Be specific with numbers from the data provided. Do not invent numbers.`;

async function jsonCall<T>(name: string, schema: Record<string, unknown>, input: string): Promise<T | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await ai().responses.create({
      model: MODEL,
      instructions: GUARDRAILS,
      input,
      text: { format: { type: "json_schema", name, schema, strict: true } },
    });
    return JSON.parse(res.output_text) as T;
  } catch (e) {
    console.error(`[ai] ${name} failed`, (e as Error).message);
    return null;
  }
}

function context(i: AssessmentInput, m: Metrics, c: Country) {
  return JSON.stringify({
    country: c.name, currency: c.currency.toUpperCase(),
    monthly: { income: m.monthlyIncome, expenses: m.monthlyExpenses, essentialExpenses: m.essentialExpenses, debtPayments: m.monthlyDebtPayments, surplus: m.monthlySurplus },
    totals: { assets: m.totalAssets, debts: m.totalDebts, consumerDebts: m.consumerDebts, savings: i.savings, netWorth: m.netWorth },
    ratios: { debtToIncome: +m.debtToIncome.toFixed(2), savingsRate: +m.savingsRate.toFixed(2), emergencyMonths: +m.emergencyMonths.toFixed(1), highInterestShare: +m.highInterestShare.toFixed(2) },
    scores: { health: m.healthScore, stress: m.stressScore, emergency: m.emergencyScore },
    debts: i.debts.map(d => ({ name: d.name, type: d.type, balance: d.balance, ratePct: d.rate, minPayment: d.minPayment })),
    assets: i.assets.map(a => ({ name: a.name, type: a.type, value: a.value })),
    expenses: i.expenses.map(e => ({ category: e.category, amount: e.amount, essential: e.essential })),
    situation: i.situation, goals: i.goals || null,
    calculatedOptions: buildSolutions(i, m, c, v => money(c, v)).map(o => ({ option: o.title, estimatedMonthlyImpact: o.monthly, oneOff: o.oneOff ?? null, detail: o.detail })),
  });
}

const adviceSchema = {
  type: "object", additionalProperties: false, required: ["summary", "recommendations", "nextSteps"],
  properties: {
    summary: { type: "string", description: "2–3 sentence plain-English summary of where they stand" },
    recommendations: {
      type: "array", minItems: 5, maxItems: 5,
      items: {
        type: "object", additionalProperties: false, required: ["title", "detail", "impact", "category"],
        properties: {
          title: { type: "string", description: "Short action, max ~60 chars, with a number where useful" },
          detail: { type: "string", description: "1–2 sentences on why and how" },
          impact: { type: "string", enum: ["high", "medium", "low"] },
          category: { type: "string" },
        },
      },
    },
    nextSteps: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" }, description: "Three things to do this week" },
  },
};

export async function aiAdvice(i: AssessmentInput, m: Metrics, c: Country): Promise<Advice | null> {
  const out = await jsonCall<Omit<Advice, "source">>("financial_health_advice", adviceSchema,
    `Here is a household's Financial Health check. Write a summary, the top 5 prioritised recommendations, and 3 next steps for this week. Be concrete: use the calculatedOptions (with their estimated monthly amounts) to show HOW to close any gap. Flag likely data-entry errors (e.g. yearly amounts entered as monthly, rent entered alongside a mortgage). Present property sales or loan restructures as options to discuss with an adviser, not instructions.\n${context(i, m, c)}`);
  return out ? { ...out, source: "openai" } : null;
}

export type PlanSummary = { headline: string; recommendedScenario: "conservative" | "balanced" | "aggressive"; why: string; tips: string[] };
const planSchema = {
  type: "object", additionalProperties: false, required: ["headline", "recommendedScenario", "why", "tips"],
  properties: {
    headline: { type: "string" }, why: { type: "string" },
    recommendedScenario: { type: "string", enum: ["conservative", "balanced", "aggressive"] },
    tips: { type: "array", minItems: 3, maxItems: 5, items: { type: "string" } },
  },
};
export async function aiPlanSummary(i: AssessmentInput, m: Metrics, c: Country, scenarios: ScenarioResult[]): Promise<PlanSummary | null> {
  const sc = scenarios.map(s => ({ scenario: s.key, monthlyToDebt: s.monthlyToDebt, monthlyToSavings: s.monthlyToSavings, consumerDebtFreeMonths: s.consumerDebtFreeMonth, mortgageFreeMonths: s.mortgageFreeMonth, totalInterest: s.totalInterest, emergencyFundMonth: s.emergencyReachedMonth }));
  return jsonCall<PlanSummary>("freedom_plan_summary", planSchema,
    `Recommend one of three debt-freedom scenarios for this household and explain why in plain English, then give 3–5 practical tips (e.g. windfalls, mortgage acceleration, spending). Household:\n${context(i, m, c)}\nScenarios:\n${JSON.stringify(sc)}`);
}

export type ReferralBrief = { brief: string; matches: { category: HelpCategory; why: string; questionsToAsk: string[] }[]; emailTemplate: string };
const briefSchema = {
  type: "object", additionalProperties: false, required: ["brief", "matches", "emailTemplate"],
  properties: {
    brief: { type: "string", description: "A one-page referral brief the person can hand to an adviser: situation, numbers, goals, what help they want. Use \\n for new lines." },
    matches: {
      type: "array", minItems: 1, maxItems: 4,
      items: {
        type: "object", additionalProperties: false, required: ["category", "why", "questionsToAsk"],
        properties: {
          category: { type: "string", enum: ["financial_adviser", "mortgage_adviser", "debt_coach", "budget_adviser", "accountant", "lawyer"] },
          why: { type: "string" },
          questionsToAsk: { type: "array", minItems: 3, maxItems: 4, items: { type: "string" } },
        },
      },
    },
    emailTemplate: { type: "string", description: "Short first-contact email to a professional, with [placeholders]" },
  },
};
export async function aiReferralBrief(i: AssessmentInput, m: Metrics, c: Country): Promise<ReferralBrief | null> {
  return jsonCall<ReferralBrief>("referral_brief", briefSchema,
    `Match this person to the most relevant types of professional help (in order of priority) and write a referral brief and first-contact email. Prefer free services first where suitable (e.g. free financial mentors/counsellors).\n${context(i, m, c)}`);
}

export async function aiAnswer(question: string, i: AssessmentInput, m: Metrics, c: Country, scenarios: ScenarioResult[]): Promise<string | null> {
  if (!aiEnabled()) return null;
  try {
    const res = await ai().responses.create({
      model: MODEL,
      instructions: GUARDRAILS + "\nAnswer the user's what-if question about their plan in under 180 words. Show a quick calculation where helpful. Suggest a licensed professional for decisions like selling property or investing.",
      input: `Household: ${context(i, m, c)}\nScenarios: ${JSON.stringify(scenarios.map(s => ({ s: s.key, debtFree: s.consumerDebtFreeMonth, mortgageFree: s.mortgageFreeMonth, interest: s.totalInterest })))}\nQuestion: ${question.slice(0, 600)}`,
    });
    return res.output_text;
  } catch (e) {
    console.error("[ai] answer failed", (e as Error).message);
    return null;
  }
}
