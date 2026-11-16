/**
 * What-if scenarios: the person chooses what to do with each property and investment,
 * and we show the effect. We calculate; the person decides. General information, not advice.
 */
import type { AssessmentInput, AssetItem, DebtItem, IncomeItem } from "./types";
import { pairProperties, pmt } from "./solutions";

export type PropAction = "keep" | "sell" | "downsize" | "rent_out" | "interest_only" | "longer_term";
export type PropChoice = { action: PropAction; price?: number; newHomePrice?: number; rent?: number; payDownId?: string };
export type DebtChoice = { rate?: number; extraMonthly?: number; termYears?: number };
export type NewAsset = { id: string; kind: "property" | "investment"; name: string; amount: number; fromSavings: number; loanRate?: number; rent?: number; costs?: number };
export type Choices = {
  props: Record<string, PropChoice>;     // by asset id
  sellPct: Record<string, number>;       // investments/other assets: % to cash out, by asset id
  retirementWithdrawal: number;          // e.g. KiwiSaver hardship withdrawal
  savingsToUse: number;                  // existing cash savings to put toward a debt
  releaseTo: string;                     // debt id that cash from investments/KiwiSaver/savings pays off ("" = keep as savings)
  debts: Record<string, DebtChoice>;     // refinance / extra repayments, by debt id
  add: NewAsset[];                       // buy a property or invest a lump sum
  spendingChange: number;                // + or − per month
};
export const NO_CHOICES: Choices = { props: {}, sellPct: {}, retirementWithdrawal: 0, savingsToUse: 0, releaseTo: "", debts: {}, add: [], spendingChange: 0 };
export const isEmpty = (c: Choices) => JSON.stringify({ ...NO_CHOICES, ...c }) === JSON.stringify(NO_CHOICES);

export type PropertyView = { asset: AssetItem; debt: DebtItem | null; use: "home" | "rental" | "other" | undefined; rentIncomes: IncomeItem[] };

const SELL_COSTS = 0.03;
const r10 = (v: number) => Math.round(v / 10) * 10;

/** Each property with its loan, how it's used and which income is its rent. */
export function propertiesOf(i: AssessmentInput): PropertyView[] {
  const pairs = pairProperties(i.debts, i.assets);
  const props = i.assets.filter(a => a.type === "property" && a.value > 0);
  const rentIncomes = i.incomes.filter(x => /rent|board|tenant/i.test(x.source) && x.amount > 0);
  const key = (a: AssetItem) => a.name.toLowerCase().split(/[\s,]+/).find(w => w.length > 2 && !/^(the|house|home|property|unit|flat)$/.test(w)) ?? "";
  const named = (a: AssetItem) => rentIncomes.filter(x => key(a) && x.source.toLowerCase().includes(key(a)));
  const views = props.map(a => ({
    asset: a,
    debt: pairs.find(p => p.asset?.id === a.id)?.debt ?? null,
    use: a.use ?? (named(a).length || /rental|invest|tenant/i.test(a.name) ? "rental" as const : /\bhome\b|live in/i.test(a.name) ? "home" as const : undefined),
    rentIncomes: named(a),
  }));
  // Unnamed rent goes to the only rental, if there is exactly one
  const rentals = views.filter(v => v.use === "rental");
  const claimed = new Set(views.flatMap(v => v.rentIncomes.map(x => x.id)));
  const loose = rentIncomes.filter(x => !claimed.has(x.id));
  if (loose.length && rentals.length === 1 && !rentals[0].rentIncomes.length) rentals[0].rentIncomes = loose;
  return views;
}

/** Apply the person's choices to their numbers. Returns new numbers plus plain-English notes. */
export function applyChoices(base: AssessmentInput, ch: Choices): { input: AssessmentInput; notes: string[]; cashFromSales: number } {
  const i: AssessmentInput = JSON.parse(JSON.stringify(base));
  const notes: string[] = [];
  let cash = 0;
  const views = propertiesOf(base);
  const payDown: { id: string; amount: number }[] = [];

  for (const v of views) {
    const c = ch.props[v.asset.id];
    if (!c || c.action === "keep") continue;
    const debt = v.debt ? i.debts.find(d => d.id === v.debt!.id) : undefined;
    const asset = i.assets.find(a => a.id === v.asset.id)!;

    if (c.action === "interest_only" && debt) {
      const old = debt.minPayment; debt.minPayment = r10(debt.balance * (debt.rate / 100) / 12);
      notes.push(`${v.asset.name}: interest-only repayments ${Math.round(old)} → ${debt.minPayment} a month (the loan stops going down).`);
    }
    if (c.action === "longer_term" && debt) {
      const old = debt.minPayment; debt.minPayment = r10(pmt(debt.balance, debt.rate, 360));
      notes.push(`${v.asset.name}: 30-year term repayments ${Math.round(old)} → ${debt.minPayment} a month (more interest overall).`);
    }
    if (c.action === "rent_out") {
      const rent = Math.max(0, c.rent ?? 0);
      if (rent > 0 && !v.rentIncomes.length) { i.incomes.push({ id: `rent-${asset.id}`, source: `Rent – ${asset.name}`, amount: rent }); asset.use = "rental"; }
      notes.push(`${v.asset.name}: rented out for ${rent} a month.${v.use === "home" ? " You'd need somewhere else to live; add that cost under spending changes." : ""}`);
    }
    if (c.action === "sell" || c.action === "downsize") {
      const price = Math.max(0, c.price ?? asset.value);
      let proceeds = price * (1 - SELL_COSTS) - (debt?.balance ?? 0);
      i.assets = i.assets.filter(a => a.id !== asset.id);
      if (debt) i.debts = i.debts.filter(d => d.id !== debt.id);
      const lostRent = v.rentIncomes.reduce((t, x) => t + x.amount, 0);
      i.incomes = i.incomes.filter(x => !v.rentIncomes.some(r => r.id === x.id));
      let line = `${v.asset.name}: sold for ${price} less ~3% costs${debt ? `, repaying the ${debt.balance} loan` : ""}${lostRent ? `; ${lostRent} a month rent stops` : ""}.`;
      if (c.action === "downsize") {
        const next = Math.max(0, c.newHomePrice ?? 0);
        proceeds -= next;
        i.assets.push({ id: `new-${asset.id}`, name: "Smaller home", type: "property", value: next, use: "home" });
        if (proceeds < 0) {
          const loan = -proceeds, rate = debt?.rate ?? 6;
          i.debts.push({ id: `newloan-${asset.id}`, name: "Smaller home", type: "mortgage", balance: Math.round(loan), rate, minPayment: r10(pmt(loan, rate, 300)) });
          line += ` Bought a ${next} home with a ${Math.round(loan)} mortgage.`;
          proceeds = 0;
        } else line += ` Bought a ${next} home with no mortgage.`;
      }
      if (proceeds < 0) {
        i.debts.push({ id: `short-${asset.id}`, name: `Shortfall after selling ${asset.name}`, type: "other", balance: Math.round(-proceeds), rate: debt?.rate ?? 8, minPayment: r10(-proceeds / 60) });
        line += ` The sale doesn't cover the loan: ${Math.round(-proceeds)} still owing.`;
        proceeds = 0;
      }
      if (proceeds > 0) { line += ` About ${Math.round(proceeds)} released.`; cash += proceeds; if (c.payDownId) payDown.push({ id: c.payDownId, amount: proceeds }); }
      if (c.action === "sell" && v.use === "home") line += " You'd need somewhere to live: add the rent under spending changes.";
      notes.push(line);
    }
  }

  // Investments and other assets: cash out part or all
  let released = 0;
  for (const a of i.assets.filter(x => x.type === "investments" || x.type === "business" || x.type === "other" || x.type === "vehicle")) {
    const pct = Math.min(100, Math.max(0, ch.sellPct[a.id] ?? 0));
    if (!pct) continue;
    const amount = a.value * pct / 100;
    a.value -= amount; released += amount;
    notes.push(`${a.name}: ${pct}% sold, about ${Math.round(amount)} released (check tax and fees).`);
  }
  // Retirement savings withdrawal (e.g. KiwiSaver significant financial hardship)
  const ret = i.assets.find(a => a.type === "retirement" && a.value > 0);
  if (ret && ch.retirementWithdrawal > 0) {
    const amount = Math.min(ret.value, ch.retirementWithdrawal);
    ret.value -= amount; released += amount;
    notes.push(`${ret.name}: ${Math.round(amount)} withdrawn (needs approval, and it lowers your retirement savings).`);
  }
  i.assets = i.assets.filter(a => a.value > 0 || a.type === "property");

  // Pay down chosen loans; repayment falls in proportion (if the lender recalculates)
  const payOff = (id: string, amount: number) => {
    const d = i.debts.find(x => x.id === id);
    if (!d || d.balance <= 0 || amount <= 0) return 0;
    const pay = Math.min(d.balance, amount);
    d.minPayment = r10(d.minPayment * (1 - pay / d.balance));
    d.balance = Math.round(d.balance - pay);
    notes.push(`${Math.round(pay)} paid off ${d.name}${d.balance > 0 ? `: it now costs about ${d.minPayment} a month (if the lender recalculates repayments)` : ": cleared"}.`);
    return pay;
  };
  let saleCash = cash;
  for (const p of payDown) saleCash -= payOff(p.id, Math.min(p.amount, saleCash));
  const fromSavings = Math.min(Math.max(0, ch.savingsToUse), Math.max(0, i.savings));
  let pool = released + fromSavings;
  if (ch.releaseTo && pool > 0) pool -= payOff(ch.releaseTo, pool);
  i.savings = Math.round(i.savings - fromSavings + saleCash + pool);
  cash += released;

  // Refinance or pay extra
  for (const d of i.debts) {
    const dc = ch.debts[d.id];
    if (!dc || d.balance <= 0) continue;
    const parts: string[] = [];
    if (dc.rate !== undefined && dc.rate !== d.rate) {
      const months = monthsLeft(d.balance, d.rate, d.minPayment) ?? 360;
      d.rate = Math.max(0, dc.rate);
      d.minPayment = r10(pmt(d.balance, d.rate, Math.min(months, 600)));
      parts.push(`rate ${d.rate}% (repayment ${d.minPayment} a month)`);
    }
    if (dc.termYears && dc.termYears > 0) { d.minPayment = r10(pmt(d.balance, d.rate, dc.termYears * 12)); parts.push(`${dc.termYears}-year term (repayment ${d.minPayment} a month)`); }
    if (dc.extraMonthly && dc.extraMonthly > 0) { d.minPayment = Math.round(d.minPayment + dc.extraMonthly); parts.push(`${Math.round(dc.extraMonthly)} a month extra`); }
    if (parts.length) notes.push(`${d.name}: ${parts.join(", ")}.`);
  }
  i.debts = i.debts.filter(d => d.balance > 0);

  // Buy a property / invest a lump sum
  for (const a of ch.add) {
    if (!(a.amount > 0)) continue;
    const deposit = Math.min(Math.max(0, a.fromSavings), a.amount, Math.max(0, i.savings));
    i.savings = Math.round(i.savings - deposit);
    if (a.kind === "investment") {
      i.assets.push({ id: a.id, name: a.name || "New investment", type: "investments", value: deposit });
      notes.push(`${a.name || "New investment"}: ${Math.round(deposit)} invested from savings.`);
      continue;
    }
    const loan = a.amount - deposit, rate = a.loanRate ?? 6;
    i.assets.push({ id: a.id, name: a.name || "New property", type: "property", value: a.amount, use: a.rent ? "rental" : "other" });
    if (loan > 0) i.debts.push({ id: `loan-${a.id}`, name: `${a.name || "New property"} loan`, type: "mortgage", balance: Math.round(loan), rate, minPayment: r10(pmt(loan, rate, 360)) });
    if (a.rent) i.incomes.push({ id: `rent-${a.id}`, source: `Rent – ${a.name || "New property"}`, amount: a.rent });
    if (a.costs) i.expenses.push({ id: `costs-${a.id}`, category: `${a.name || "New property"} rates, insurance & upkeep`, amount: a.costs, essential: true });
    notes.push(`${a.name || "New property"}: bought for ${a.amount} with ${Math.round(deposit)} deposit${loan > 0 ? ` and a ${Math.round(loan)} loan at ${rate}%` : ""}${a.rent ? `, rented for ${a.rent} a month` : ""}.`);
  }

  if (ch.spendingChange) {
    i.expenses.push({ id: "spending-change", category: ch.spendingChange < 0 ? "Spending cut" : "Extra cost", amount: ch.spendingChange, essential: true });
    notes.push(`Monthly spending ${ch.spendingChange < 0 ? "cut" : "increased"} by ${Math.abs(ch.spendingChange)}.`);
  }
  return { input: i, notes, cashFromSales: Math.round(cash) };
}

/** Months to repay at this payment, or null if the payment doesn't cover the interest. */
export function monthsLeft(balance: number, ratePct: number, payment: number): number | null {
  const r = ratePct / 100 / 12;
  if (balance <= 0) return 0;
  if (r === 0) return payment > 0 ? Math.ceil(balance / payment) : null;
  if (payment <= balance * r) return null;
  return Math.ceil(-Math.log(1 - (r * balance) / payment) / Math.log(1 + r));
}

export type DebtTimeline = { debtFree: number | null; mortgageFree: number | null; consumerFree: number | null; interest: number; capped: boolean; perDebt: Record<string, { name: string; month: number | null }> };
/** Each debt repaid at its own repayment (no rolling over). Interest counted up to 50 years. */
export function debtTimeline(i: AssessmentInput): DebtTimeline {
  const H = 600;
  let interest = 0, capped = false;
  const done: { mortgage: boolean; month: number | null }[] = [];
  const perDebt: DebtTimeline["perDebt"] = {};
  for (const d of i.debts.filter(x => x.balance > 0)) {
    let bal = d.balance, m = 0; const r = d.rate / 100 / 12;
    while (bal > 0.5 && m < H) { const int = bal * r; interest += int; bal = bal + int - Math.max(0, d.minPayment); m++; if (d.minPayment <= int && r > 0) { interest += int * (H - m); m = H; break; } }
    const month = bal > 0.5 ? null : m;
    if (month === null) capped = true;
    done.push({ mortgage: d.type === "mortgage", month });
    perDebt[d.id] = { name: d.name, month };
  }
  const maxOf = (xs: { month: number | null }[]) => (xs.length ? (xs.some(x => x.month === null) ? null : Math.max(...xs.map(x => x.month as number))) : 0);
  return { debtFree: maxOf(done), mortgageFree: maxOf(done.filter(x => x.mortgage)), consumerFree: maxOf(done.filter(x => !x.mortgage)), interest: Math.round(interest), capped, perDebt };
}
