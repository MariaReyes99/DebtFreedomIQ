import type { AssessmentInput, Metrics } from "@/lib/types";
import type { Country } from "@/lib/countries";
import { crisisLabel } from "@/lib/countries";
import { Card } from "./ui";

const tel = (p?: string) => (p ? `tel:${p.replace(/[^\d+]/g, "")}` : undefined);

/** Two or three big, obvious actions. Nothing else. */
export default function DoFirst({ input, m, c }: { input: AssessmentInput; m: Metrics; c: Country }) {
  const s = input.situation;
  const short = m.monthlySurplus < 0;
  const hasDebt = input.debts.some(d => d.balance > 0);
  const gov = c.groups.find(g => /government|benefit/i.test(g.title))?.items[0];
  const actions: { icon: string; title: string; sub: string; href?: string; label: string; tone: "teal" | "navy" | "red" }[] = [];
  actions.push({ icon: "📞", title: `Call ${c.firstCall.name}`, sub: "Free, confidential help with money and debt. Best first step for most people.", href: tel(c.firstCall.phone) ?? c.firstCall.url, label: c.firstCall.phone ? `Call ${c.firstCall.phone}` : "Visit website", tone: "teal" });
  if (hasDebt && (short || s.behindOnBills || s.housingAtRisk)) actions.push({ icon: "🏦", title: "Talk to your lender", sub: "Ask for a hardship arrangement before you miss a payment. We'll help you with what to say.", href: "/help#letter", label: "Get the letter", tone: "navy" });
  if (s.lostIncome && gov) actions.push({ icon: "🧾", title: `Apply for income support`, sub: `${gov.name}: support usually starts from when you apply.`, href: tel(gov.phone) ?? gov.url, label: gov.phone ? `Call ${gov.phone}` : "Apply online", tone: "navy" });
  else if (s.cantAffordFood || s.housingAtRisk) actions.push({ icon: "🍲", title: "Get food or housing help today", sub: "Free local services can help this week.", href: "/help", label: "Find help near me", tone: "navy" });
  if (s.distressed || m.stressScore >= 75) actions.push({ icon: "💬", title: "Talk to someone now", sub: `${crisisLabel(c.crisis.name, c.crisis.phone)}`, href: tel(c.crisis.phone), label: c.crisis.phone ? `Call ${c.crisis.phone}` : "Get support", tone: "red" });
  return (
    <section aria-labelledby="do-first">
      <h2 id="do-first" className="mb-3 text-xl font-bold">Do these first</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actions.slice(0, 4).map(a => (
          <Card key={a.title} className="flex flex-col">
            <p className="text-3xl" aria-hidden>{a.icon}</p>
            <h3 className="mt-2 text-lg font-bold">{a.title}</h3>
            <p className="mt-1 flex-1 text-sm text-navy-600">{a.sub}</p>
            {a.href && <a href={a.href} className={`mt-3 rounded-full px-4 py-3 text-center text-base font-bold text-white ${a.tone === "teal" ? "bg-teal-600 hover:bg-teal-700" : a.tone === "red" ? "bg-red-600 hover:bg-red-700" : "bg-navy-900 hover:bg-navy-800"}`}>{a.label}</a>}
          </Card>
        ))}
      </div>
    </section>
  );
}
