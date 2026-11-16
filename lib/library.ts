/**
 * Hand the person's numbers to the Investment Research Library's wealth projector,
 * so they never type them twice. The numbers travel in the URL fragment (after #),
 * which browsers don't send to any server; the Library reads them in the browser.
 * Shape follows the Library's HouseholdInputSchema (lib/finance/household.ts).
 */
import type { AssessmentInput } from "./types";
import { propertiesOf } from "./whatif";

// Your Library's live address on Vercel; NEXT_PUBLIC_LIBRARY_URL overrides it (e.g. a custom domain).
const DEFAULT_LIBRARY_URL = "https://investment-research-library-mu.vercel.app";
export const LIBRARY_URL = (process.env.NEXT_PUBLIC_LIBRARY_URL || DEFAULT_LIBRARY_URL).replace(/\/+$/, "");
const LIB_COUNTRY: Record<string, string> = { NZ: "NZ", AU: "AU", US: "US", GB: "UK", PH: "PH" };
const DEFAULT_RETIRE: Record<string, number> = { NZ: 65, AU: 67, US: 67, GB: 67, PH: 65 };
const nm = (s: string) => (s.trim() || "Item").slice(0, 80);
const pos = (v: number) => Math.max(0, Math.round(v));

export function toHousehold(i: AssessmentInput, ages: { age: number; retireAge?: number }) {
  const country = LIB_COUNTRY[i.country] ?? "NZ";
  const retirementAge = ages.retireAge ?? DEFAULT_RETIRE[i.country] ?? 65;
  const props = propertiesOf(i);
  const propDebtIds = new Set(props.map(p => p.debt?.id).filter(Boolean));
  const rentIds = new Set(props.flatMap(p => p.rentIncomes.map(r => r.id)));
  return {
    country,
    you: { currentAge: ages.age, retirementAge: Math.max(retirementAge, 16) },
    endAge: Math.max(90, ages.age + 1),
    cashOnHand: pos(i.savings),
    investments: i.assets.filter(a => (a.type === "retirement" || a.type === "investments") && a.value > 0).map(a => a.type === "retirement"
      ? { name: nm(a.name), kind: country === "NZ" ? "kiwisaver" : "retirement_account", owner: "you", balance: pos(a.value), returnPct: 5.5, feesPct: 0.8, monthlyContribution: 0 }
      : { name: nm(a.name), kind: "index_fund", owner: "you", balance: pos(a.value), returnPct: 6, feesPct: 0.4, monthlyContribution: 0 }),
    properties: props.map(p => ({
      name: nm(p.asset.name), value: pos(p.asset.value), growthPct: 3,
      mortgageBalance: pos(p.debt?.balance ?? 0), mortgageRatePct: Math.min(25, p.debt?.rate ?? 0), monthlyRepayment: pos(p.debt?.minPayment ?? 0),
      monthlyNetRent: pos(p.rentIncomes.reduce((t, r) => t + r.amount, 0)),
    })),
    otherAssets: i.assets.filter(a => (a.type === "vehicle" || a.type === "business" || a.type === "other") && a.value > 0)
      .map(a => ({ name: nm(a.name), kind: a.type === "vehicle" ? "vehicle" : a.type === "business" ? "business" : "other", value: pos(a.value) })),
    debts: i.debts.filter(d => d.balance > 0 && !propDebtIds.has(d.id))
      .map(d => ({ name: nm(d.name), balance: pos(d.balance), ratePct: Math.min(50, d.rate), monthlyPayment: pos(d.minPayment) })),
    incomes: i.incomes.filter(x => x.amount > 0 && !rentIds.has(x.id)).map(x => {
      const kind = /rent|board/i.test(x.source) ? "rental" : /pension|super\b|social security/i.test(x.source) ? "pension" : /benefit|support|credit|allowance/i.test(x.source) ? "other" : "salary";
      return { name: nm(x.source), kind, owner: "you", monthlyAmount: pos(x.amount) };
    }),
    livingExpensesMonthly: pos(i.expenses.reduce((t, e) => t + e.amount, 0)),
  };
}

const b64url = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let bin = ""; bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Link that opens the Library's projector already filled in. Null if the Library address isn't set. */
export function libraryLink(i: AssessmentInput, ages: { age: number; retireAge?: number }) {
  if (!LIBRARY_URL) return null;
  return `${LIBRARY_URL}/?tab=numbers&view=full#plan=${b64url(JSON.stringify(toHousehold(i, ages)))}`;
}
