/**
 * The Freedom Plan as a dated, step-by-step plan:
 *   1. Stabilise: close the monthly gap (only if short each month)
 *   2. Build a buffer
 *   3. Pay down debt (the three scenarios, using real spare money)
 * Built from the person's latest check plus the choices they picked in the Simulator.
 * General information, not advice.
 */
import type { AssessmentInput } from "./types";
import type { Country } from "./countries";
import { calculate } from "./finance";
import { buildSolutions } from "./solutions";
import { applyChoices, debtTimeline, propertiesOf, NO_CHOICES, isEmpty, type Choices } from "./whatif";

export type StepSource = "essential" | "your-choice" | "suggested" | "check";
export type PlanStep = { id: string; title: string; detail?: string; due: string; monthly?: number; oneOff?: number; source: StepSource; href?: string };
export type FreedomPlan = {
  hasChoices: boolean;
  before: { surplus: number; savings: number; runwayMonths: number | null; runOutDate: string | null };
  after: { surplus: number; savings: number; runwayMonths: number | null; totalDebts: number; interest: number };
  stabilise: { needed: boolean; gap: number; closedByChoices: number; closedBySuggestions: number; decideBy: string | null; steps: PlanStep[] };
  buffer: { target: number; have: number; reachedBy: string | null; status: "done" | "on-track" | "waiting"; steps: PlanStep[] };
  paydown: { blocked: boolean; perDebt: { name: string; date: string | null }[] };
  afterInput: AssessmentInput;
};

const DAY = 864e5;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const runway = (surplus: number, savings: number) => (surplus >= 0 ? null : savings <= 0 ? 0 : savings / -surplus);

export function buildFreedomPlan(base: AssessmentInput, choicesRaw: Choices | null | undefined, c: Country, fmt: (n: number) => string, today = new Date()): FreedomPlan {
  const choices = { ...NO_CHOICES, ...(choicesRaw ?? {}) } as Choices;
  const mB = calculate(base);
  const applied = applyChoices(base, choices);
  const after = applied.input;
  const mA = calculate(after);
  const tA = debtTimeline(after);
  const rB = runway(mB.monthlySurplus, base.savings);
  const rA = runway(mA.monthlySurplus, after.savings);
  const at = (days: number) => iso(new Date(today.getTime() + days * DAY));
  // Squeeze deadlines when cash is about to run out
  const urgency = rB === null ? 1 : rB < 2 ? 0.5 : rB < 4 ? 0.75 : 1;
  const due = (days: number) => at(Math.max(2, Math.round(days * urgency)));
  const decideBy = rB !== null && rB > 0 ? at(Math.max(7, (rB - 1) * 30.4)) : rB === 0 ? at(7) : null;

  // ── Stage 1: stabilise ──────────────────────────────────────────────
  const gap = Math.max(0, -mB.monthlySurplus);
  const steps: PlanStep[] = [];
  if (gap > 0) {
    steps.push({ id: "call-mentor", source: "essential", due: due(7), title: `Call ${c.firstCall.name}${c.firstCall.phone ? ` (${c.firstCall.phone})` : ""}: free help`, detail: `${c.firstCall.what}. Take this plan with you.` });
    if (base.debts.some(d => d.balance > 0)) steps.push({ id: "call-lenders", source: "essential", due: due(7), title: "Tell your lenders now, before you miss a payment", detail: "Ask about a hardship arrangement: lower repayments, interest-only or a payment pause. Lenders have more options while you're still up to date." });
  }
  // Numbers that look wrong come first: fixing them can change everything
  for (const s of buildSolutions(base, mB, c, fmt).filter(s => s.kind === "fix")) steps.push({ id: `check-${s.id}`, source: "check", due: due(3), title: s.title, detail: s.detail, href: "/health?edit=1" });

  // Your own choices from the Simulator, as concrete actions
  const props = propertiesOf(base);
  const debtName = (id?: string) => base.debts.find(d => d.id === id)?.name;
  for (const [assetId, pc] of Object.entries(choices.props)) {
    const p = props.find(x => x.asset.id === assetId);
    if (!p || pc.action === "keep") continue;
    const n = p.asset.name;
    if (pc.action === "interest_only" || pc.action === "longer_term")
      steps.push({ id: `c-${assetId}-${pc.action}`, source: "your-choice", due: due(10), title: `Ask your bank for ${pc.action === "interest_only" ? "interest-only repayments" : "a 30-year term"} on ${n}`, detail: "Ask for it in writing, and how long it lasts. It costs more interest overall, so treat it as breathing space." });
    if (pc.action === "rent_out")
      steps.push({ id: `c-${assetId}-rent`, source: "your-choice", due: due(30), title: `Find a tenant for ${n} (about ${fmt(pc.rent ?? 0)}/month)`, detail: "Check your insurance, lender consent and rental standards first. A property manager usually charges 7–10% of the rent." });
    if (pc.action === "sell" || pc.action === "downsize") {
      steps.push({ id: `c-${assetId}-appraise`, source: "your-choice", due: due(14), title: `Get two appraisals for ${n}`, detail: `You planned on about ${fmt(pc.price ?? p.asset.value)}. Check that's realistic.` });
      steps.push({ id: `c-${assetId}-tax`, source: "your-choice", due: due(21), title: `Check tax on selling ${n} with an accountant`, detail: c.code === "NZ" ? "For example the bright-line test for a rental." : "For example capital gains tax." });
      steps.push({ id: `c-${assetId}-list`, source: "your-choice", due: due(35), title: `List ${n} for sale${pc.action === "downsize" ? ` and look for a home around ${fmt(pc.newHomePrice ?? 0)}` : ""}`, detail: pc.payDownId ? `Plan to put the money on ${debtName(pc.payDownId)}.` : "Plan to keep the money as savings." });
    }
  }
  const sold = Object.entries(choices.sellPct).filter(([, pct]) => pct > 0);
  for (const [id, pct] of sold) {
    const a = base.assets.find(x => x.id === id);
    if (!a) continue;
    steps.push({ id: `c-sell-${id}`, source: "your-choice", due: due(a.type === "investments" ? 14 : 30), oneOff: Math.round(a.value * pct / 100), title: `Sell ${pct}% of ${a.name} (about ${fmt(a.value * pct / 100)})`, detail: `${a.type === "investments" ? "Check tax and fees, and avoid selling straight after a market fall." : "Get independent valuations first; resale is often below insured value."}${choices.releaseTo ? ` Put it toward ${debtName(choices.releaseTo)}.` : ""}` });
  }
  if (choices.retirementWithdrawal > 0) steps.push({ id: "c-kiwisaver", source: "your-choice", due: due(14), oneOff: choices.retirementWithdrawal, title: c.code === "NZ" ? `Apply to your KiwiSaver provider for a hardship withdrawal (${fmt(choices.retirementWithdrawal)})` : `Ask about an early retirement-savings withdrawal (${fmt(choices.retirementWithdrawal)})`, detail: "You'll need evidence of your situation. It lowers your retirement savings." });
  if (choices.savingsToUse > 0) steps.push({ id: "c-savings", source: "your-choice", due: due(7), oneOff: choices.savingsToUse, title: `Use ${fmt(choices.savingsToUse)} of savings${choices.releaseTo ? ` to pay down ${debtName(choices.releaseTo)}` : ""}`, detail: "Keep enough aside for emergencies." });
  for (const [id, dc] of Object.entries(choices.debts)) {
    const d = base.debts.find(x => x.id === id);
    if (!d) continue;
    if (dc.rate !== undefined && dc.rate !== d.rate) steps.push({ id: `c-rate-${id}`, source: "your-choice", due: due(21), title: `Ask lenders for ${dc.rate}% on ${d.name}`, detail: "Ask your current lender to match, then compare at least two others. A mortgage adviser is usually free to you." });
    if (dc.termYears) steps.push({ id: `c-term-${id}`, source: "your-choice", due: due(21), title: `Ask to change ${d.name} to a ${dc.termYears}-year term` });
    if (dc.extraMonthly) steps.push({ id: `c-extra-${id}`, source: "your-choice", due: due(14), title: `Set up an extra ${fmt(dc.extraMonthly / 4.33)}/week on ${d.name}`, detail: "Only once your monthly gap is closed." });
  }
  if (choices.spendingChange < 0) steps.push({ id: "c-spend", source: "your-choice", due: due(7), monthly: -choices.spendingChange, title: `Cut spending by ${fmt(-choices.spendingChange)}/month`, detail: "Set a weekly limit and cancel unused subscriptions." });
  for (const a of choices.add) if (a.amount > 0) steps.push({ id: `c-add-${a.id}`, source: "your-choice", due: due(60), title: a.kind === "property" ? `Look into buying ${a.name} (${fmt(a.amount)})` : `Invest ${fmt(a.fromSavings)} in ${a.name}`, detail: a.kind === "property" ? "Only after Stages 1 and 2 are done; get finance pre-approval and advice first." : "Only after your buffer is in place." });

  // Still short after your choices? Suggest the next options (test them in the Simulator)
  const closedByChoices = Math.max(0, mA.monthlySurplus - mB.monthlySurplus);
  let remaining = Math.max(0, -mA.monthlySurplus), closedBySuggestions = 0;
  if (remaining > 0) {
    const chosenSale = Object.values(choices.props).some(p => p.action === "sell" || p.action === "downsize");
    const skip = new Set([...(chosenSale ? ["sell"] : []), ...(sold.length ? ["sell-investments", "sell-valuables"] : [])]);
    const extra = buildSolutions(after, mA, c, fmt).filter(s => s.kind !== "fix" && s.monthly > 0 && !skip.has(s.id));
    let k = 0;
    for (const s of extra) {
      if (remaining <= 0 || k >= 4) break;
      steps.push({ id: `s-${s.id}`, source: "suggested", due: due(14 + k * 7), monthly: s.monthly, oneOff: s.oneOff, title: s.title, detail: `${s.detail}${s.caution ? ` ${s.caution}` : ""}`, href: "/whatif" });
      remaining -= s.monthly; closedBySuggestions += s.monthly; k++;
    }
  }
  steps.sort((a, b) => a.due.localeCompare(b.due));

  // ── Stage 2: buffer ──────────────────────────────────────────────────
  const target = Math.round(((mA.monthlyExpenses + mA.monthlyDebtPayments) * 3) / 1000) * 1000;
  const have = Math.max(0, after.savings);
  const status: FreedomPlan["buffer"]["status"] = have >= target && mA.monthlySurplus >= 0 ? "done" : mA.monthlySurplus > 0 ? "on-track" : "waiting";
  const monthsToBuffer = status === "on-track" ? Math.max(0, (target - have) / mA.monthlySurplus) : 0;
  const bufferSteps: PlanStep[] = status === "done" ? [] : [
    { id: "b-account", source: "essential", due: at(status === "on-track" ? 14 : 60), title: "Open a separate savings account for emergencies", detail: "Keep it out of sight of everyday spending." },
    { id: "b-auto", source: "essential", due: at(status === "on-track" ? 14 : 60), title: status === "on-track" ? `Set up an automatic ${fmt(Math.min(mA.monthlySurplus, Math.max(0, target - have)))}/month transfer on payday` : "Set up an automatic transfer once your gap is closed" },
  ];

  // ── Stage 3: pay down ────────────────────────────────────────────────
  const perDebt = Object.values(tA.perDebt).map(d => ({ name: d.name, date: d.month === null ? null : iso(new Date(today.getFullYear(), today.getMonth() + d.month, 1)) }));

  return {
    hasChoices: !isEmpty(choices),
    before: { surplus: mB.monthlySurplus, savings: base.savings, runwayMonths: rB, runOutDate: rB !== null ? at(rB * 30.4) : null },
    after: { surplus: mA.monthlySurplus, savings: after.savings, runwayMonths: rA, totalDebts: mA.totalDebts, interest: tA.interest },
    stabilise: { needed: gap > 0, gap, closedByChoices: Math.round(closedByChoices), closedBySuggestions: Math.round(closedBySuggestions), decideBy, steps },
    buffer: { target, have, reachedBy: status === "on-track" ? at(monthsToBuffer * 30.4) : status === "done" ? iso(today) : null, status, steps: bufferSteps },
    paydown: { blocked: mA.monthlySurplus <= 0 || status === "waiting", perDebt },
    afterInput: after,
  };
}
