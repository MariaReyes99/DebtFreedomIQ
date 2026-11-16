import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { COUNTRIES, DEFAULT_COUNTRY, money, toCountryCode } from "@/lib/countries";
import { track } from "@/lib/events";
import WhatIfLab from "@/components/WhatIfLab";
import { Button, Card, Disclaimer, PageHeader, PremiumGate } from "@/components/ui";

export const metadata = { title: "Financial Simulator" };

export default async function WhatIfPage() {
  const { user, isPremium, tier, country, displayCountry } = await getSession();
  const latest = user ? await loadLatest(user.id) : null;
  const c = country ?? displayCountry;
  await track("premium_view", { userId: user?.id, country: c.code, props: { page: "whatif", premium: isPremium } });
  const header = <PageHeader eyebrow="Premium" title="Financial Simulator">See the result of every move before you make it: sell, buy, refinance or use savings, and see your cash flow, debts, net worth and retirement change. Uses the numbers from your Financial Health check, so there&apos;s nothing to re-enter.</PageHeader>;

  if (!isPremium) return (
    <div className="mx-auto max-w-7xl px-4 py-10">{header}
      <PremiumGate title="See the result of every move before you make it" price={money(c, c.premiumPrice)}>
        <div className="grid gap-4 md:grid-cols-2"><Card><p className="font-bold">Sell · Rent out · Downsize · Restructure</p><p>Before 3 months · After 14 months</p></Card><Card><p className="font-bold">Retirement at 65</p><p>Net worth NZ$ —</p></Card></div>
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
      <WhatIfLab input={latest.input} countryCode={cc} plus={tier === "premium_plus"} />
      <Disclaimer className="mt-6" />
      <p className="mt-2 text-xs text-navy-500">Currency: {COUNTRIES[cc].currency.toUpperCase()}. Figures are estimates from the numbers you entered.</p>
    </div>
  );
}
