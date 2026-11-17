/**
 * One-click scenarios for the Simulator's Basic mode, built from the person's own numbers.
 * Each card changes part of the choices; several can be combined.
 */
import type { AssessmentInput } from "./types";
import { propertiesOf, type Choices } from "./whatif";

export type Group = "property" | "debt" | "investments" | "retirement" | "life";
export type QuickPick = { id: string; group: Group; icon: string; title: string; detail: string; apply: (c: Choices) => Choices; retireAge?: number; plusOnly?: boolean };
export const GROUPS: { key: Group; label: string; icon: string }[] = [
  { key: "property", label: "Property", icon: "🏠" }, { key: "debt", label: "Debt", icon: "💳" },
  { key: "investments", label: "Investments", icon: "📈" }, { key: "retirement", label: "Retirement", icon: "🌅" }, { key: "life", label: "Life events", icon: "🌱" },
];
const SCALE: Record<string, number> = { NZ: 1, AU: 0.92, US: 0.6, GB: 0.47, PH: 34 };
const r100 = (n: number) => Math.round(n / 100) * 100;

export function quickPicks(i: AssessmentInput, fmt: (n: number) => string): QuickPick[] {
  const k = SCALE[i.country] ?? 1;
  const out: QuickPick[] = [];
  const props = propertiesOf(i);
  const debts = i.debts.filter(d => d.balance > 0);
  const biggestPay = (exclude?: string) => [...debts].filter(d => d.id !== exclude).sort((a, b) => b.rate - a.rate || b.minPayment - a.minPayment)[0];

  // Property
  for (const p of props) {
    const target = biggestPay(p.debt?.id);
    if (p.use !== "home") out.push({ id: `sell-${p.asset.id}`, group: "property", icon: "🏷️", title: `Sell ${p.asset.name}`, detail: `At about ${fmt(p.asset.value)}${target ? `, putting the money on ${target.name}` : ""}.`, apply: c => ({ ...c, props: { ...c.props, [p.asset.id]: { action: "sell", price: p.asset.value, payDownId: target?.id } } }) });
    if (p.use === "home") out.push({ id: `down-${p.asset.id}`, group: "property", icon: "🏡", title: `Move to a smaller home`, detail: `Sell ${p.asset.name} and buy for about ${fmt(Math.round(p.asset.value * 0.6 / 1000) * 1000)}.`, plusOnly: false, apply: c => ({ ...c, props: { ...c.props, [p.asset.id]: { action: "downsize", price: p.asset.value, newHomePrice: Math.round(p.asset.value * 0.6 / 1000) * 1000, payDownId: biggestPay(p.debt?.id)?.id } } }) });
    if (p.debt) out.push({ id: `io-${p.asset.id}`, group: "property", icon: "⏸️", title: `Interest-only on ${p.asset.name}`, detail: `Smaller repayments for a while; the loan stops going down.`, apply: c => ({ ...c, props: { ...c.props, [p.asset.id]: { action: "interest_only" } } }) });
  }
  if (props.some(p => p.use === "home")) out.push({ id: "boarder", group: "property", icon: "🛏️", title: "Rent out a spare room", detail: `About ${fmt(r100(1000 * k))} a month from a boarder or flatmate.`, apply: c => ({ ...c, incomeChange: (c.incomeChange ?? 0) + r100(1000 * k) }) });

  // Debt
  const mort = debts.filter(d => d.type === "mortgage").sort((a, b) => b.balance - a.balance)[0];
  if (mort) out.push({ id: "refi", group: "debt", icon: "🔄", title: `Refinance ${mort.name} 1% lower`, detail: `From ${mort.rate}% to ${Math.max(0, mort.rate - 1)}%: lower repayments and less interest.`, plusOnly: true, apply: c => ({ ...c, debts: { ...c.debts, [mort.id]: { ...(c.debts[mort.id] ?? {}), rate: Math.max(0, mort.rate - 1) } } }) });
  const top = biggestPay();
  if (top) out.push({ id: "extra", group: "debt", icon: "➕", title: `Pay ${fmt(r100(50 * k) || 50)} a week extra on ${top.name}`, detail: "Clears it sooner and saves interest. Only once your monthly gap is closed.", plusOnly: true, apply: c => ({ ...c, debts: { ...c.debts, [top.id]: { ...(c.debts[top.id] ?? {}), extraMonthly: (r100(50 * k) || 50) * 4.33 } } }) });
  const costly = [...debts].filter(d => d.type !== "mortgage").sort((a, b) => b.rate - a.rate)[0];
  if (costly && i.savings > 0) out.push({ id: "savings-clear", group: "debt", icon: "🧹", title: `Use savings to clear ${costly.name}`, detail: `Up to ${fmt(Math.min(i.savings, costly.balance))} from savings. Keep some aside for emergencies.`, plusOnly: true, apply: c => ({ ...c, savingsToUse: Math.min(i.savings, costly.balance), releaseTo: costly.id }) });

  // Investments and valuables
  const inv = i.assets.filter(a => a.type === "investments" && a.value > 0);
  const target = biggestPay();
  for (const a of inv) {
    out.push({ id: `inv25-${a.id}`, group: "investments", icon: "📉", title: `Sell a quarter of ${a.name}`, detail: `About ${fmt(a.value * 0.25)}${target ? ` toward ${target.name}` : " into savings"}.`, apply: c => ({ ...c, sellPct: { ...c.sellPct, [a.id]: 25 }, releaseTo: target?.id ?? c.releaseTo }) });
    out.push({ id: `inv50-${a.id}`, group: "investments", icon: "📉", title: `Sell half of ${a.name}`, detail: `About ${fmt(a.value * 0.5)}${target ? ` toward ${target.name}` : " into savings"}.`, apply: c => ({ ...c, sellPct: { ...c.sellPct, [a.id]: 50 }, releaseTo: target?.id ?? c.releaseTo }) });
  }
  for (const a of i.assets.filter(x => x.type === "other" && x.value > 0)) out.push({ id: `val-${a.id}`, group: "investments", icon: "💍", title: `Sell ${a.name}`, detail: `Resale is usually below the value entered (${fmt(a.value)}). Get valuations first.`, apply: c => ({ ...c, sellPct: { ...c.sellPct, [a.id]: 100 }, releaseTo: target?.id ?? c.releaseTo }) });
  const car = i.assets.find(a => a.type === "vehicle" && a.value >= 15000 * k);
  if (car) out.push({ id: "car", group: "investments", icon: "🚗", title: "Swap to a cheaper car", detail: `Frees about ${fmt(car.value * 0.6)}.`, apply: c => ({ ...c, sellPct: { ...c.sellPct, [car.id]: 60 }, releaseTo: target?.id ?? c.releaseTo }) });

  // Retirement
  const ret = i.assets.find(a => a.type === "retirement" && a.value > 0);
  if (ret) { const amt = Math.min(ret.value, r100(10000 * k)); out.push({ id: "ks", group: "retirement", icon: "🏦", title: i.country === "NZ" ? `KiwiSaver hardship withdrawal (${fmt(amt)})` : `Early withdrawal from retirement savings (${fmt(amt)})`, detail: "Only with approval for real hardship. It lowers your retirement savings.", apply: c => ({ ...c, retirementWithdrawal: amt }) }); }
  for (const age of [60, 65, 70]) out.push({ id: `ret${age}`, group: "retirement", icon: "🌅", title: `Retire at ${age}`, detail: "Changes the retirement figures.", retireAge: age, plusOnly: true, apply: c => c });

  // Life events
  const salary = [...i.incomes].filter(x => !/rent|board|benefit|support|pension/i.test(x.source) && x.amount > 0).sort((a, b) => b.amount - a.amount)[0];
  if (salary) out.push({ id: "jobloss", group: "life", icon: "📭", title: "Job loss", detail: `${salary.source} (${fmt(salary.amount)}/month) stops.`, plusOnly: true, apply: c => ({ ...c, incomeChange: (c.incomeChange ?? 0) - salary.amount }) });
  if (salary) out.push({ id: "payrise", group: "life", icon: "📈", title: "10% pay rise", detail: `About ${fmt(salary.amount * 0.1)} more a month.`, plusOnly: true, apply: c => ({ ...c, incomeChange: (c.incomeChange ?? 0) + Math.round(salary.amount * 0.1) }) });
  out.push({ id: "baby", group: "life", icon: "👶", title: "New baby", detail: `About ${fmt(r100(800 * k))} a month more in costs (edit in Expert mode).`, plusOnly: true, apply: c => ({ ...c, spendingChange: (c.spendingChange ?? 0) + r100(800 * k) }) });
  out.push({ id: "inherit", group: "life", icon: "🎁", title: "Inheritance or windfall", detail: `${fmt(r100(50000 * k))} one-off into savings (edit in Expert mode).`, plusOnly: true, apply: c => ({ ...c, lumpSum: (c.lumpSum ?? 0) + r100(50000 * k) }) });
  out.push({ id: "bigcost", group: "life", icon: "🧰", title: "Big one-off cost", detail: `A ${fmt(r100(10000 * k))} repair or bill paid from savings.`, plusOnly: true, apply: c => ({ ...c, lumpSum: (c.lumpSum ?? 0) - r100(10000 * k) }) });
  return out;
}
