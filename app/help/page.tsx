import Image from "next/image";
import { getSession } from "@/lib/session";
import { loadLatest, fmtFor } from "@/lib/assessment";
import { HELP_CATEGORIES, matchHelp, fallbackBrief, CREDITOR_TEMPLATE, ACCOUNTANT_BODIES, LOCAL_SEARCH, mapsSearchUrl } from "@/lib/help";
import { getArea } from "@/lib/area";
import { placesEnabled } from "@/lib/places";
import LocalHelp from "@/components/LocalHelp";
import AreaForm from "@/components/AreaForm";
import { COUNTRIES, DEFAULT_COUNTRY, money, toCountryCode, type Resource } from "@/lib/countries";
import { track } from "@/lib/events";
import type { HelpCategory } from "@/lib/types";
import BriefGenerator from "@/components/BriefGenerator";
import CopyBox from "@/components/CopyBox";
import HelpTriage, { type Need } from "@/components/HelpTriage";
import SupportTeam from "@/components/SupportTeam";
import { buildTeam, readiness } from "@/lib/supportteam";
import { crisisReasons, waiverEnabled } from "@/lib/crisis";
import CheckoutButton from "@/components/CheckoutButton";
import { buildSolutions } from "@/lib/solutions";
import { latestPlan } from "@/lib/plan-row";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, PageHeader, PremiumGate, Disclaimer } from "@/components/ui";

export const metadata = { title: "Find Help" };

function ResourceRow({ r, tag }: { r: Resource; tag?: "first" | "urgent" }) {
  return (
    <li className="border-t border-navy-100 py-3 first:border-0">
      {tag && <p className="mb-1">{tag === "urgent" ? <Badge tone="red">🔴 Immediate support</Badge> : <Badge tone="green">🟢 Best first step for most people</Badge>}</p>}
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
  const area = await getArea(profile);
  const placesOn = placesEnabled();
  const matches = latest ? matchHelp(latest.input, latest.metrics) : [];
  const fb = latest ? fallbackBrief(latest.input, latest.metrics, c, fmtFor(c), profile?.full_name) : null;

  const findGroups = (re: RegExp) => c.groups.filter(g => re.test(g.title));
  const PLURAL: Record<HelpCategory, string> = { budget_adviser: "budget advisers", debt_coach: "debt help services", mortgage_adviser: "mortgage advisers", financial_adviser: "financial advisers", accountant: "accountants", lawyer: "legal aid & lawyers" };
  const firstWithPhone = (re: RegExp, skip?: string) => { const items = findGroups(re).flatMap(g => g.items).filter(r => r.name !== skip); return items.find(r => r.phone || r.email) ?? items.find(r => r.url); };
  const contactFor = (k: HelpCategory): { name: string; phone?: string; email?: string; url?: string; note?: string } | null => {
    if (k === "budget_adviser") return c.firstCall;
    if (k === "debt_coach") return firstWithPhone(/not-for-profit|Money & debt/, c.firstCall.name) ?? null;
    if (k === "lawyer") return firstWithPhone(/Legal|Complaints|Debt restructuring/) ?? null;
    if (k === "accountant") return { ...ACCOUNTANT_BODIES[c.code], note: "Find a qualified accountant" };
    return { name: c.adviserRegister.name, url: c.adviserRegister.url, note: "Check they're licensed" };
  };
  const whereToFind: Record<HelpCategory, Resource[]> = {
    budget_adviser: [c.firstCall, ...findGroups(/Money & debt help/).flatMap(g => g.items)].slice(0, 3),
    debt_coach: findGroups(/Money & debt help|not-for-profit/).flatMap(g => g.items).slice(0, 4),
    mortgage_adviser: [{ name: c.adviserRegister.name, what: "Check any adviser is registered/licensed before you meet. Ask how they're paid (commission or fee).", url: c.adviserRegister.url }],
    financial_adviser: [{ name: c.adviserRegister.name, what: "Check the adviser is licensed. Ask for fees in writing and whether they're independent.", url: c.adviserRegister.url }],
    accountant: [{ ...ACCOUNTANT_BODIES[c.code], what: "Find a qualified accountant or free tax help." }],
    lawyer: findGroups(/Legal|Complaints/).flatMap(g => g.items).slice(0, 3),
  };

  // Triage: the best places to start for each kind of need, from this country's services
  const items = (re: RegExp, nameRe?: RegExp) => findGroups(re).flatMap(g => g.items).filter(r => !nameRe || nameRe.test(r.name + " " + r.what));
  const uniq = (rs: (Resource | undefined)[]) => rs.filter((r, i, a): r is Resource => !!r && a.findIndex(x => x?.name === r.name) === i).slice(0, 3);
  const near = (k: HelpCategory, label: string) => ({ label: `${label}${area.city ? ` near ${area.city}` : " near you"} on Google Maps`, url: mapsSearchUrl(LOCAL_SEARCH[c.code][k], area.city, c.name) });
  const crisisRes: Resource = { name: c.crisis.name, what: "Free, confidential support any time", phone: c.crisis.phone, text: c.crisis.text };
  const needs: Need[] = [
    { key: "bills", icon: "🧾", label: "I can't pay my bills", items: uniq([c.firstCall, ...items(/Money & debt|not-for-profit|Debt restructuring/)]), nearYou: near("budget_adviser", "Budget help"), extra: { label: "Write a hardship letter to a lender", href: "#letter" } },
    { key: "home", icon: "🏠", label: "I may lose my home", items: uniq([...items(/housing|Mortgage|Housing loan/, /tenan|shelter|housing|counsel|Pag-IBIG|rent|home/i), ...items(/Legal/), c.firstCall]), nearYou: near("lawyer", "Free legal help"), extra: { label: "Hardship letter for your lender or landlord", href: "#letter" } },
    { key: "collectors", icon: "📨", label: "Debt collectors or court", items: uniq([...items(/Legal/), ...items(/./, /Public Attorney|Legal Aid|LawHelp/i), ...items(/Complaints|lenders|Money & debt/, /complain|CFPB|AFCA|BSP|Ombudsman/i), c.firstCall]), nearYou: near("lawyer", "Free legal help") },
    { key: "food", icon: "🍲", label: "I need food", items: uniq([...items(/^(?!Health)/, /food|pantry|SNAP|Trussell|Salvation|Vinnies|Vincent|Izzy|Family Services|Citizens Advice Bureau|211|AICS/i), ...items(/Government|Benefit/, /grant|hardship|Work and Income|Centrelink|Universal Credit|benefit/i)]), nearYou: { label: `Food banks${area.city ? ` near ${area.city}` : " near you"} on Google Maps`, url: mapsSearchUrl("food bank", area.city, c.name) } },
    { key: "job", icon: "💼", label: "I lost my job or income", items: uniq([...items(/./, /unemploy|jobseeker|Universal Credit|Centrelink|Work and Income \(MSD\)|SSS|DOLE/i), ...items(/Lost your job|Government|Benefit/), c.firstCall]) },
    { key: "health", icon: "🏥", label: "Medical or hospital bills", items: uniq(items(/Health/)) },
    { key: "overwhelmed", icon: "💬", label: "I feel overwhelmed", items: [{ ...crisisRes, tag: "urgent" as const }, ...uniq(items(/Emotional/)).filter(r => r.name !== c.crisis.name && !/emergency/i.test(r.name)).slice(0, 1), c.firstCall] },
  ].filter(n => n.items.length > 0);

  // Premium: the support team, ranked by priority, with readiness
  // Crisis access: if they told us they're in crisis, the support team and referral package are free
  const crisis = !isPremium && latest ? crisisReasons(latest.input) : [];
  const teamOpen = isPremium || crisis.length > 0;
  const team = teamOpen && latest ? buildTeam(latest.input, latest.metrics, matches, buildSolutions(latest.input, latest.metrics, c, fmtFor(c)), fmtFor(c)) : [];
  const hasPlan = teamOpen && latest && user ? !!(await latestPlan(await createClient(), user.id).catch(() => null)) : false;
  const contacts = Object.fromEntries(team.map(t => [t.category, contactFor(t.category)]));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Get help" title={`Free help in ${c.name}`}>{`You don't have to work this out alone. Tell us what's happening and we'll show you who to contact first${area.city ? ` near ${area.city}` : ""}.`}</PageHeader>

      <div className="mb-10"><HelpTriage needs={needs} area={area.city} /></div>

      {/* Free: hardship letter */}
      <section id="letter" aria-labelledby="letter-h" className="mb-10 scroll-mt-24">
        <h2 id="letter-h" className="mb-3 text-xl font-bold">Hardship letter to a lender or landlord <Badge tone="green" className="ml-2 align-middle">Free</Badge></h2>
        <Card><CopyBox title="Copy, add your details, and send it today" text={CREDITOR_TEMPLATE(profile?.full_name ?? "", c.rightsNote)} /></Card>
      </section>

      {/* Free: categories */}
      <section aria-labelledby="cats">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="cats" className="text-xl font-bold">Types of help near you</h2>
          <AreaForm city={area.city} source={area.source} />
        </div>
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
                <LocalHelp category={k} label={PLURAL[k]} area={area.city} placesOn={placesOn} contact={contactFor(k)}
                  mapsUrl={mapsSearchUrl(LOCAL_SEARCH[c.code][k], area.city, c.name)} />
              </Card>
            );
          })}
        </div>
      </section>

      {/* Premium */}
      <section aria-labelledby="matched" className="mt-10">
        <h2 id="matched" className="mb-3 text-xl font-bold">Your financial support team {crisis.length ? <Badge tone="teal" className="ml-2 align-middle">Free for you</Badge> : <Badge tone="navy" className="ml-2 align-middle">Premium</Badge>}</h2>
        {crisis.length > 0 && (
          <p className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-[15px] text-teal-900">
            💚 <strong>This is free for you.</strong> You told us about {crisis.join(", ")}. Your support team, referral package and checklist cost nothing: getting you to the right person comes first.
          </p>
        )}
        {!teamOpen ? (
          <>
          <PremiumGate title="Get your financial support team" price={price}>
            <div className="grid gap-4 md:grid-cols-2">
              {["Budget Adviser", "Debt Coach", "Mortgage Adviser", "Lawyer"].map(t => <div key={t} className="rounded-xl border p-5"><p className="text-lg font-bold">{t}</p><p className="mt-2">Why this helps you, and three questions to ask at your first appointment…</p></div>)}
              <div className="rounded-xl border p-5 md:col-span-2"><p className="font-bold">Your personalised referral brief</p><p className="mt-2">Monthly position · Debts · Assets · Goals · What I&apos;d like help with…</p></div>
            </div>
          </PremiumGate>
          {waiverEnabled() && user && <div className="mt-3 text-center text-sm"><span className="text-navy-600">Can&apos;t afford it right now? </span><CheckoutButton endpoint="/api/waiver" label="Get Premium free" variant="ghost" /></div>}
          </>
        ) : !latest || !fb ? (
          <Card className="text-center"><p>Do your Financial Health check first so we can match you.</p><Button href="/health" className="mt-3">Start the check</Button></Card>
        ) : (
          <div className="space-y-6">
            <SupportTeam team={team} contacts={contacts} readiness={readiness(latest.input, hasPlan)} brief={fb.brief} countryCode={c.code} name={profile?.full_name ?? ""} />
            <details className="rounded-2xl border border-navy-100 bg-white p-4"><summary className="cursor-pointer font-semibold">Your referral brief and booking email</summary><div className="mt-4">
            <BriefGenerator initial={{ brief: fb.brief, emailTemplate: fb.emailTemplate, matches: matches.map(m => ({ ...m, questionsToAsk: [] })), source: "rules" }} />
            </div></details>
            <Card>
              <h3 className="text-lg font-bold">Where to find each type of help</h3>
              <div className="mt-3 grid gap-6 md:grid-cols-2">
                {matches.map(m => (
                  <div key={m.category}><p className="font-semibold text-teal-700">{HELP_CATEGORIES[m.category].icon} {HELP_CATEGORIES[m.category].label}</p><ul>{whereToFind[m.category].map(r => <ResourceRow key={r.name} r={r} />)}</ul></div>
                ))}
              </div>
            </Card>
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
          {c.groups.map(g => <Card key={g.title}><h3 className="font-bold">{g.title}</h3><ul className="mt-2">{g.items.map(r => <ResourceRow key={r.name + (r.phone ?? "")} r={r} tag={r.name === c.firstCall.name ? "first" : /emotional/i.test(g.title) && r.name === g.items[0]?.name ? "urgent" : undefined} />)}</ul></Card>)}
        </div>
        <p className="mt-3 text-sm text-navy-600"><strong>Know your rights:</strong> {c.rightsNote}</p>
      </section>
      <Disclaimer className="mt-8" />
    </div>
  );
}
