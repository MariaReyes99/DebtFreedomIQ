import type { AssessmentInput, Metrics, DebtItem, AssetItem } from "./types";
import type { Country } from "./countries";

export type Solution = {
  id: string;
  kind: "fix" | "debt" | "income" | "cost" | "asset" | "support";
  title: string;
  detail: string;
  monthly: number;        // estimated monthly improvement (0 = helps, but amount unknown)
  oneOff?: number;        // one-off cash released (e.g. equity)
  caution?: string;
};

const pmt = (principal: number, ratePct: number, months: number) => {
  const i = ratePct / 100 / 12;
  return i === 0 ? principal / months : (principal * i) / (1 - Math.pow(1 + i, -months));
};
const round = (v: number, step = 10) => Math.round(v / step) * step;
const isPropertyDebt = (d: DebtItem) => d.type === "mortgage" || /house|home|mortgage|property/i.test(d.name);

/** Typical monthly boarder income (local currency) — a rough, conservative figure. */
const BOARDER: Record<string, number> = { NZ: 1000, AU: 1000, GB: 600, US: 700, PH: 8000 };
/** Government help to check, by country. */
const ENTITLEMENTS: Record<string, string> = {
  NZ: "Work and Income: Accommodation Supplement, Temporary Additional Support, Working for Families and hardship grants. Some help is available even if you're working.",
  AU: "Centrelink: Rent Assistance, Family Tax Benefit and income support, plus energy hardship programs.",
  GB: "Universal Credit (including housing costs), Council Tax Reduction and Turn2us grants. Use the Turn2us benefits calculator.",
  US: "SNAP food benefits, LIHEAP energy help, Medicaid/ACA subsidies and local rent assistance via 211.",
  PH: "DSWD AICS crisis assistance, 4Ps (if eligible), and PhilHealth/Malasakit help with any medical costs.",
};
const NO_INTEREST: Record<string, string> = {
  NZ: "a Good Shepherd Good Loan or Ngā Tāngata Microfinance (no-interest)",
  AU: "a No Interest Loan (NILs) from Good Shepherd",
  GB: "a credit union loan or a debt charity's fee-free debt management plan",
  US: "a nonprofit credit counseling debt management plan (lower interest)",
  PH: "the CCAP Interbank Debt Relief Program (for credit cards)",
};

/** Match each property-type debt to a property asset (by name, else by order). */
function pairProperties(debts: DebtItem[], assets: AssetItem[]) {
  const props = assets.filter(a => a.type === "property" && a.value > 0);
  const used = new Set<string>();
  return debts.filter(d => d.balance > 0 && isPropertyDebt(d)).map(d => {
    const word = d.name.toLowerCase().split(/\s+/)[0];
    let a = props.find(p => !used.has(p.id) && p.name.toLowerCase().includes(word));
    if (!a) a = props.find(p => !used.has(p.id));
    if (a) used.add(a.id);
    return { debt: d, asset: a ?? null };
  });
}

/** Concrete, numbers-based options to improve monthly cash flow. General information, not advice. */
export function buildSolutions(i: AssessmentInput, m: Metrics, c: Country, fmt: (n: number) => string): Solution[] {
  const out: Solution[] = [];
  const gap = Math.max(0, -m.monthlySurplus);
  const pairs = pairProperties(i.debts, i.assets);
  const hasRentIncome = i.incomes.some(x => /rent|board/i.test(x.source) && x.amount > 0);

  // 1. Likely data problems first — fixing these can change the picture completely
  const rentExp = i.expenses.find(e => /rent|board/i.test(e.category) && e.amount > 0);
  if (rentExp && pairs.length)
    out.push({ id: "fix-rent", kind: "fix", monthly: rentExp.amount, title: `Check the ${fmt(rentExp.amount)} "${rentExp.category}" expense`, detail: "You also have a home loan. If you own the home you live in, your mortgage repayment replaces rent, so this may be counted twice. Remove it if so." });
  for (const e of i.expenses) {
    if (m.monthlyIncome > 0 && e.amount > m.monthlyIncome * 0.6 && e !== rentExp)
      out.push({ id: `fix-${e.id}`, kind: "fix", monthly: round(e.amount - e.amount / 12), title: `Is "${e.category}" ${fmt(e.amount)} a yearly amount?`, detail: `That's ${Math.round((e.amount / m.monthlyIncome) * 100)}% of your monthly income. If it's yearly, the monthly figure is about ${fmt(round(e.amount / 12))}. Edit your answers to correct it.` });
  }

  // 2. Restructure property loans (interest-only or longer term)
  for (const { debt: d } of pairs) {
    if (d.minPayment <= 0) continue;
    const io = round(d.balance * (d.rate / 100) / 12);
    const term30 = round(pmt(d.balance, d.rate, 360));
    const best = Math.min(io, term30);
    if (d.minPayment - best > 50) {
      out.push({
        id: `restructure-${d.id}`, kind: "debt", monthly: round(d.minPayment - best),
        title: `Restructure ${d.name}: cut repayments by up to ${fmt(round(d.minPayment - best))}/month`,
        detail: `Your repayment is ${fmt(d.minPayment)}/month. Interest-only would be about ${fmt(io)}/month, or extending to a 30-year term about ${fmt(term30)}/month (${fmt(d.balance)} at ${d.rate}%). Ask your bank about a hardship variation or restructure. ${c.rightsNote}`,
        caution: "Interest-only and longer terms cost more interest overall. Use them to get through a tough period, not forever.",
      });
    }
  }

  // How each property is used: what the person told us, else a careful guess from names and income
  const rentIncomes = i.incomes.filter(x => /rent|board|tenant/i.test(x.source) && x.amount > 0);
  const key = (a: AssetItem) => a.name.toLowerCase().split(/\s+/).find(w => w.length > 2 && !/^(the|house|home|property|unit|flat)$/.test(w)) ?? "";
  const mentions = (a: AssetItem) => rentIncomes.filter(x => key(a) && x.source.toLowerCase().includes(key(a)));
  const useOf = (a: AssetItem) => a.use ?? (mentions(a).length || /rental|invest|tenant/i.test(a.name) ? "rental" : /\bhome\b|live in/i.test(a.name) ? "home" : undefined);
  const withAsset = pairs.filter(p => p.asset) as { debt: DebtItem; asset: AssetItem }[];
  const rentals = withAsset.filter(p => useOf(p.asset) === "rental");
  const rentFrom = (a: AssetItem) => {
    const named = mentions(a).reduce((t, x) => t + x.amount, 0);
    if (named) return named;
    return useOf(a) === "rental" && rentals.length === 1 ? rentIncomes.reduce((t, x) => t + x.amount, 0) : 0;
  };

  // 3. Rental income from a property that isn't lived in and has no rent entered
  if (withAsset.length >= 2) {
    const unrented = withAsset.filter(p => useOf(p.asset) !== "home" && rentFrom(p.asset) === 0);
    const known = unrented.filter(p => useOf(p.asset) !== undefined);
    const target = known[0];
    if (target) {
      const rent = round(target.asset.value * 0.04 / 12, 50);
      out.push({ id: "rent-income", kind: "income", monthly: rent, title: `Rent out ${target.asset.name} (about ${fmt(rent)}/month)`, detail: `${useOf(target.asset) === "rental" ? `You marked ${target.asset.name} as rented out but no rent is entered for it. Add the real amount under Income.` : `${target.asset.name} isn't lived in.`} A typical rent for a ${fmt(target.asset.value)} property is roughly ${fmt(rent)}/month (about 4% a year), which could cover much of its ${fmt(target.debt.minPayment)}/month mortgage.` });
    } else if (!hasRentIncome && withAsset.every(p => useOf(p.asset) === undefined)) {
      out.push({ id: "fix-use", kind: "fix", monthly: 0, title: "Tell us which property you live in", detail: `You have ${withAsset.length} properties. On the "What you own" step, mark each one as "I live here", "Rented out" or "Empty". Then we can show the right options and never suggest selling your home by mistake.` });
    }
  }

  // 4. Sell a property to release equity: the rental first, never guess the family home
  if (gap > 0 && withAsset.length) {
    const sale = (p: { debt: DebtItem; asset: AssetItem }) => round(p.asset.value * 0.97 - p.debt.balance, 1000); // ~3% selling costs
    const isOnly = withAsset.length === 1;
    const candidates = isOnly ? withAsset : rentals.length ? rentals : withAsset.filter(p => useOf(p.asset) === "other");
    const pick = [...candidates].filter(p => sale(p) > 0).sort((x, y) => sale(y) - sale(x))[0];
    if (pick) {
      const equity = sale(pick);
      const lostRent = rentFrom(pick.asset);
      // Use the cash to pay down the remaining mortgage (largest first): its repayment falls in proportion
      const other = withAsset.filter(p => p !== pick).sort((x, y) => y.debt.balance - x.debt.balance)[0];
      const paid = other ? Math.min(equity, other.debt.balance) : 0;
      const otherCut = other && other.debt.balance > 0 ? round(other.debt.minPayment * (paid / other.debt.balance)) : 0;
      const net = round(pick.debt.minPayment - lostRent + otherCut);
      const label = isOnly ? "Consider downsizing" : `Consider selling ${pick.asset.name}${useOf(pick.asset) === "rental" ? " (your rental)" : ""}`;
      out.push({ id: "sell", kind: "asset", monthly: Math.max(0, net), oneOff: equity,
        title: `${label}: improves cash flow by about ${fmt(Math.max(0, net))}/month`,
        detail: [
          `Selling at about ${fmt(pick.asset.value)} (less ~3% costs) repays its ${fmt(pick.debt.balance)} loan and releases about ${fmt(equity)}.`,
          `Its ${fmt(pick.debt.minPayment)}/month repayment stops${lostRent ? `, but you lose ${fmt(lostRent)}/month rent` : ""}.`,
          other ? `Putting ${fmt(paid)} toward ${other.asset.name} (${fmt(other.debt.balance)} owing) could cut its ${fmt(other.debt.minPayment)}/month repayment by about ${fmt(otherCut)} if the bank recalculates your payments, leaving about ${fmt(other.debt.balance - paid)} owing in total.` : "Moving to a cheaper home could do something similar.",
        ].join(" "),
        caution: `A big decision and an alternative to restructuring. Check tax (e.g. bright-line rules in NZ) with an accountant and talk to a financial adviser first. A planned sale is usually far better than a forced mortgagee sale.` });
    }
  }

  // 5. Boarder / flatmate
  if (pairs.length >= 1 && gap > 0)
    out.push({ id: "boarder", kind: "income", monthly: BOARDER[c.code] ?? 0, title: `Take in a boarder or flatmate (about ${fmt(BOARDER[c.code] ?? 0)}/month)`, detail: "A spare room can bring in steady income quickly. Check your insurance and lender conditions first." });

  // 6. Insurance review
  const ins = i.expenses.filter(e => /insur/i.test(e.category)).reduce((s, e) => s + e.amount, 0);
  if (ins > 0 && m.monthlyIncome > 0 && ins > m.monthlyIncome * 0.1)
    out.push({ id: "insurance", kind: "cost", monthly: round(ins * 0.25), title: `Review your insurance (${fmt(ins)}/month)`, detail: `Insurance is ${Math.round((ins / m.monthlyIncome) * 100)}% of your income. Compare quotes, raise excesses, remove doubled-up cover and ask about paying annually. A 25% saving is about ${fmt(round(ins * 0.25))}/month. Don't drop essential cover (house, health) without advice.` });

  // 7. Trim non-essential spending
  const nonEss = i.expenses.filter(e => !e.essential && e.amount > 0);
  const nonEssTotal = nonEss.reduce((s, e) => s + e.amount, 0);
  if (nonEssTotal > 0)
    out.push({ id: "trim", kind: "cost", monthly: round(nonEssTotal * 0.3), title: `Cut non-essential spending by 30% (${fmt(round(nonEssTotal * 0.3))}/month)`, detail: `Biggest items: ${nonEss.sort((a, b) => b.amount - a.amount).slice(0, 3).map(e => `${e.category} ${fmt(e.amount)}`).join(", ")}. Cancel unused subscriptions and set a weekly spending limit.` });

  // 8. High-interest consumer debt
  const hi = i.debts.filter(d => !isPropertyDebt(d) && d.balance > 0 && d.rate >= 15).sort((a, b) => b.rate - a.rate);
  if (hi.length) {
    const interest = round(hi.reduce((s, d) => s + d.balance * (d.rate / 100) / 12, 0));
    out.push({ id: "high-interest", kind: "debt", monthly: round(interest * 0.6), title: `Cut the interest on ${hi.map(d => d.name).join(", ")}`, detail: `These cost about ${fmt(interest)}/month in interest. Ask for a rate reduction or hardship arrangement, or look at ${NO_INTEREST[c.code]}.` });
  }

  // 9. Ask every lender for hardship help
  if (gap > 0 && i.debts.length)
    out.push({ id: "hardship", kind: "debt", monthly: 0, title: "Ask every lender for a hardship arrangement", detail: `Ask each lender for a payment pause, lower repayments or reduced interest while you get back on track. Use the hardship letter in Find Help. ${c.rightsNote}` });

  // 10. Entitlements
  if (gap > 0 || m.stressScore >= 50)
    out.push({ id: "entitlements", kind: "support", monthly: 0, title: "Check government support you may be missing", detail: ENTITLEMENTS[c.code] ?? "Check local government support." });

  // Rank: data fixes first, then by monthly impact
  return out.sort((a, b) => (a.kind === "fix" ? -1 : 0) - (b.kind === "fix" ? -1 : 0) || b.monthly - a.monthly);
}
