import Image from "next/image";
import { getSession } from "@/lib/session";
import { loadLatest, fmtFor } from "@/lib/assessment";
import { HELP_CATEGORIES, matchHelp, fallbackBrief, CREDITOR_TEMPLATE, ACCOUNTANT_BODIES } from "@/lib/help";
import { COUNTRIES, DEFAULT_COUNTRY, money, toCountryCode, type Resource } from "@/lib/countries";
import { track } from "@/lib/events";
import type { HelpCategory } from "@/lib/types";
import BriefGenerator from "@/components/BriefGenerator";
import CopyBox from "@/components/CopyBox";
import { Badge, Button, Card, PageHeader, PremiumGate, Disclaimer } from "@/components/ui";

export const metadata = { title: "Find Help" };

function ResourceRow({ r }: { r: Resource }) {
  return (
    <li className="border-t border-navy-100 py-3 first:border-0">
      <p className="font-semibold">{r.name}</p>
      <p className="text-sm text-navy-600">{r.what}</p>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {r.phone && <a className="font-semibold text-teal-700 hover:underline" href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}>📞 {r.phone}</a>}
        {r.text && <span>💬 Text {r.text}</span>}
        {r.email && <a className="font-semibold text-teal-700 hover:underline" href={`mailto:${r.email}`}>✉️ {r.email}</a>}
        {r.url && <a className="font-semibold text-teal-700 hover:underline" href={r.url} target="_blank" rel="noopener noreferrer">Website ↗</a>}
      </p>
      {r.hours && <p className="text-xs text-navy-500">{r.hours}</p>}
    </li>
  );
}

export default async function HelpPage() {
  const { user, profile, country, displayCountry, isPremium } = await getSession();
  const latest = user ? await loadLatest(user.id) : null;
  const c = COUNTRIES[toCountryCode(latest?.input.country) ?? country?.code ?? DEFAULT_COUNTRY] ?? displayCountry;
  await track("help_view", { userId: user?.id, country: c.code, props: { premium: isPremium } });
  const price = money(c, c.premiumPrice);
  const matches = latest ? matchHelp(latest.input, latest.metrics) : [];
  const fb = latest ? fallbackBrief(latest.input, latest.metrics, c, fmtFor(c), profile?.full_name) : null;

  const findGroups = (re: RegExp) => c.groups.filter(g => re.test(g.title));
  const whereToFind: Record<HelpCategory, Resource[]> = {
    budget_adviser: [c.firstCall, ...findGroups(/Money & debt help/).flatMap(g => g.items)].slice(0, 3),
    debt_coach: findGroups(/Money & debt help|not-for-profit/).flatMap(g => g.items).slice(0, 4),
    mortgage_adviser: [{ name: c.adviserRegister.name, what: "Check any adviser is registered/licensed before you meet. Ask how they're paid (commission or fee).", url: c.adviserRegister.url }],
    financial_adviser: [{ name: c.adviserRegister.name, what: "Check the adviser is licensed. Ask for fees in writing and whether they're independent.", url: c.adviserRegister.url }],
    accountant: [{ ...ACCOUNTANT_BODIES[c.code], what: "Find a qualified accountant or free tax help." }],
    lawyer: findGroups(/Legal|Complaints/).flatMap(g => g.items).slice(0, 3),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Find Help" title={`The right help in ${c.name}`}>Most people don&apos;t know who can help. We match your situation to the right type of professional, and show the free services you can use today.</PageHeader>

      {/* Free: categories */}
      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-3 text-xl font-bold">Types of help</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(HELP_CATEGORIES) as HelpCategory[]).map(k => {
            const h = HELP_CATEGORIES[k];
            const rank = isPremium ? matches.findIndex(x => x.category === k) : -1;
            return (
              <Card key={k} className={rank === 0 ? "border-teal-300 ring-2 ring-teal-100" : ""}>
                <div className="flex items-start justify-between gap-2"><span className="text-3xl" aria-hidden>{h.icon}</span>{rank >= 0 && <Badge tone="teal">#{rank + 1} for you</Badge>}</div>
                <h3 className="mt-2 text-lg font-bold">{h.label}</h3>
                <p className="mt-1 text-sm text-navy-700">{h.what}</p>
                <p className="mt-2 text-sm"><span className="font-semibold">When:</span> <span className="text-navy-600">{h.when}</span></p>
                <p className="mt-1 text-sm"><span className="font-semibold">Cost:</span> <span className="text-navy-600">{h.cost}</span></p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Premium */}
      <section aria-labelledby="matched" className="mt-10">
        <h2 id="matched" className="mb-3 text-xl font-bold">Your personalised matches &amp; referral brief <Badge tone="navy" className="ml-2 align-middle">Premium</Badge></h2>
        {!isPremium ? (
          <PremiumGate title="Get matched to the right support" price={price}>
            <div className="grid gap-4 md:grid-cols-2">
              {["Budget Adviser", "Debt Coach", "Mortgage Adviser", "Lawyer"].map(t => <div key={t} className="rounded-xl border p-5"><p className="text-lg font-bold">{t}</p><p className="mt-2">Why this helps you, and three questions to ask at your first appointment…</p></div>)}
              <div className="rounded-xl border p-5 md:col-span-2"><p className="font-bold">Your personalised referral brief</p><p className="mt-2">Monthly position · Debts · Assets · Goals · What I&apos;d like help with…</p></div>
            </div>
          </PremiumGate>
        ) : !latest || !fb ? (
          <Card className="text-center"><p>Do your Financial Health check first so we can match you.</p><Button href="/health" className="mt-3">Start the check</Button></Card>
        ) : (
          <div className="space-y-6">
            <BriefGenerator initial={{ brief: fb.brief, emailTemplate: fb.emailTemplate, matches: matches.map(m => ({ ...m, questionsToAsk: [] })), source: "rules" }} />
            <Card>
              <h3 className="text-lg font-bold">Where to find each type of help</h3>
              <div className="mt-3 grid gap-6 md:grid-cols-2">
                {matches.map(m => (
                  <div key={m.category}><p className="font-semibold text-teal-700">{HELP_CATEGORIES[m.category].icon} {HELP_CATEGORIES[m.category].label}</p><ul>{whereToFind[m.category].map(r => <ResourceRow key={r.name} r={r} />)}</ul></div>
                ))}
              </div>
            </Card>
            <Card><CopyBox title="Hardship letter to a creditor" text={CREDITOR_TEMPLATE(profile?.full_name ?? "", c.rightsNote)} /></Card>
          </div>
        )}
      </section>

      {/* Always free: community & government directory */}
      <section aria-labelledby="free" className="mt-10">
        <div className="relative mb-4 overflow-hidden rounded-3xl bg-navy-900">
          <Image src="/images/meeting-adviser.jpg" alt="" fill className="object-cover opacity-30" sizes="100vw" />
          <div className="relative p-6 sm:p-8">
            <Badge tone="teal">Always free</Badge>
            <h2 id="free" className="mt-2 text-2xl font-bold text-white">Free community &amp; government support in {c.name}</h2>
            <p className="mt-1 max-w-2xl text-navy-100">You never need to pay to find out where free help is. Start with <strong>{c.firstCall.name}</strong>{c.firstCall.phone ? ` (${c.firstCall.phone})` : ""}.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {c.groups.map(g => <Card key={g.title}><h3 className="font-bold">{g.title}</h3><ul className="mt-2">{g.items.map(r => <ResourceRow key={r.name + (r.phone ?? "")} r={r} />)}</ul></Card>)}
        </div>
        <p className="mt-3 text-sm text-navy-600"><strong>Know your rights:</strong> {c.rightsNote}</p>
      </section>
      <Disclaimer className="mt-8" />
    </div>
  );
}
