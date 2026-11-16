/**
 * What-if scenarios: the person chooses what to do with each property and investment,
 * and we show the effect. We calculate; the person decides. General information, not advice.
 */
import type { AssessmentInput, AssetItem, DebtItem, IncomeItem } from "./types";
import { pairProperties, pmt } from "./solutions";

export type PropAction = "keep" | "sell" | "downsize" | "rent_out" | "interest_only" | "longer_term";
export type PropChoice = { action: PropAction; price?: number; newHomePrice?: number; rent?: number; payDownId?: string };
export type Choices = {
  props: Record<string, PropChoice>;     // by asset id
  sellPct: Record<string, number>;       // investments: % to cash out, by asset id
  retirementWithdrawal: number;          // e.g. KiwiSaver hardship withdrawal
  spendingChange: number;                // + or − per month
};
export const NO_CHOICES: Choices = { props: {}, sellPct: {}, retirementWithdrawal: 0, spendingChange: 0 };

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

  // Investments: cash out part or all
  for (const a of i.assets.filter(x => x.type === "investments" || x.type === "business" || x.type === "other" || x.type === "vehicle")) {
    const pct = Math.min(100, Math.max(0, ch.sellPct[a.id] ?? 0));
    if (!pct) continue;
    const amount = a.value * pct / 100;
    a.value -= amount; cash += amount;
    notes.push(`${a.name}: ${pct}% sold, about ${Math.round(amount)} released (check tax and fees).`);
  }
  // Retirement savings withdrawal (e.g. KiwiSaver significant financial hardship)
  const ret = i.assets.find(a => a.type === "retirement" && a.value > 0);
  if (ret && ch.retirementWithdrawal > 0) {
    const amount = Math.min(ret.value, ch.retirementWithdrawal);
    ret.value -= amount; cash += amount;
    notes.push(`${ret.name}: ${Math.round(amount)} withdrawn (needs approval, and it lowers your retirement savings).`);
  }

  // Use released money to pay down a chosen loan; repayment falls in proportion
  let left = cash;
  for (const p of payDown) {
    const d = i.debts.find(x => x.id === p.id);
    if (!d || d.balance <= 0) continue;
    const pay = Math.min(d.balance, p.amount, left);
    const share = pay / d.balance;
    d.minPayment = r10(d.minPayment * (1 - share));
    d.balance = Math.round(d.balance - pay);
    left -= pay;
    notes.push(`${Math.round(pay)} paid off ${d.name}: it now costs about ${d.minPayment} a month (if the bank recalculates repayments).`);
  }
  i.debts = i.debts.filter(d => d.balance > 0);
  i.savings = Math.round(i.savings + left);
  if (ch.spendingChange) {
    i.expenses.push({ id: "spending-change", category: ch.spendingChange < 0 ? "Spending cut" : "Extra cost", amount: ch.spendingChange, essential: true });
    notes.push(`Monthly spending ${ch.spendingChange < 0 ? "cut" : "increased"} by ${Math.abs(ch.spendingChange)}.`);
  }
  return { input: i, notes, cashFromSales: Math.round(cash) };
}
