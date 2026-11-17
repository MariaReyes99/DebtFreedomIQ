import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { COUNTRIES, DEFAULT_COUNTRY, money, toCountryCode } from "@/lib/countries";
import { track } from "@/lib/events";
import WhatIfLab from "@/components/WhatIfLab";
import { Button, Card, Disclaimer, PageHeader, PremiumGate } from "@/components/ui";

export const metadata = { title: "Explore my future" };

export default async function WhatIfPage({ searchParams }: { searchParams: Promise<{ try?: string }> }) {
  const { try: tryFirst } = await searchParams;
  const { user, isPremium, tier, country, displayCountry } = await getSession();
  const latest = user ? await loadLatest(user.id) : null;
  const c = country ?? displayCountry;
  await track("premium_view", { userId: user?.id, country: c.code, props: { page: "whatif", premium: isPremium } });
  const header = <PageHeader eyebrow="Premium" title="Explore my future">See where each move takes you, before you make it. Uses your Financial Health numbers: nothing to re-enter.</PageHeader>;

  if (!isPremium) return (
    <div className="mx-auto max-w-7xl px-4 py-10">{header}
      <PremiumGate title="See the result of every move before you make it" price={money(c, c.premiumPrice)} points={["Your best overall option, scored and explained", "How each move changes your month", "Risk dashboard: debt, housing and retirement", "Side-by-side comparison of every option", "Uses your Financial Health numbers: nothing to re-enter"]}>
        <div className="space-y-4">
          <Card><p className="text-xs font-bold uppercase text-teal-700">🏆 Best overall outcome · by our scoring</p><p className="mt-1 text-xl font-bold">Sell some investments + interest-only for 2 years</p><div className="mt-3 grid grid-cols-3 gap-3 text-sm"><div><p>Each month</p><p className="font-bold">−4,200 → +350</p></div><div><p>Financial risk</p><p className="font-bold">High → Medium</p></div><div><p>Score</p><p className="font-bold">78/100</p></div></div></Card>
          <div className="grid gap-4 md:grid-cols-2"><Card><p className="font-bold">How each move changes your month</p><div className="mt-3 flex h-28 items-end gap-2">{[90, 30, 45, 60, 20, 70].map((h, k) => <div key={k} className="flex-1 rounded bg-teal-500" style={{ height: `${h}%` }} />)}</div></Card><Card><p className="font-bold">Risk dashboard</p>{["Financial risk", "Housing security", "Retirement readiness"].map(l => <div key={l} className="mt-3"><p className="text-sm">{l}</p><div className="h-2.5 rounded-full bg-amber-400" /></div>)}</Card></div>
          <Card><p className="font-bold">Compare the options</p>{["Keep everything", "Sell the rental", "Interest-only", "Balanced mix"].map(l => <div key={l} className="mt-2 flex justify-between border-t pt-2 text-sm"><span>{l}</span><span>—</span></div>)}</Card>
        </div>
      </PremiumGate>
    </div>
  );
  if (!latest || latest.incomplete) return (
    <div className="mx-auto max-w-3xl px-4 py-10">{header}
      <Card className="text-center"><p className="text-lg font-bold">First, do your Financial Health check</p><p className="mt-1 text-navy-600">The what-ifs start from your numbers{latest?.incomplete ? ", and your last check was saved without its debts" : ""}.</p><Button href="/health?edit=1" className="mt-4">Do my Financial Health check</Button></Card>
    </div>
  );
  const cc = toCountryCode(latest.input.country) ?? DEFAULT_COUNTRY;
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">{header}
      <WhatIfLab input={latest.input} countryCode={cc} plus={tier === "premium_plus"} tryFirst={tryFirst} />
      <Disclaimer className="mt-6" />
      <p className="mt-2 text-xs text-navy-500">Currency: {COUNTRIES[cc].currency.toUpperCase()}. Figures are estimates from the numbers you entered.</p>
    </div>
  );
}
