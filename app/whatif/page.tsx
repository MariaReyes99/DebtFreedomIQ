import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { COUNTRIES, DEFAULT_COUNTRY, money, toCountryCode } from "@/lib/countries";
import { track } from "@/lib/events";
import WhatIfLab from "@/components/WhatIfLab";
import { Button, Card, Disclaimer, PageHeader, PremiumGate } from "@/components/ui";

export const metadata = { title: "What-if & Retirement" };

export default async function WhatIfPage() {
  const { user, isPremium, country, displayCountry } = await getSession();
  const latest = user ? await loadLatest(user.id) : null;
  const c = country ?? displayCountry;
  await track("premium_view", { userId: user?.id, country: c.code, props: { page: "whatif", premium: isPremium } });
  const header = <PageHeader eyebrow="Premium" title="What-if & Retirement">Test choices for your property and savings, see the effect on your cash flow and debts, then see your retirement picture. Uses the numbers from your Financial Health check, so there&apos;s nothing to re-enter.</PageHeader>;

  if (!isPremium) return (
    <div className="mx-auto max-w-7xl px-4 py-10">{header}
      <PremiumGate title="Test your choices before you make them" price={money(c, c.premiumPrice)}>
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
      <WhatIfLab input={latest.input} countryCode={cc} />
      <Disclaimer className="mt-6" />
      <p className="mt-2 text-xs text-navy-500">Currency: {COUNTRIES[cc].currency.toUpperCase()}. Figures are estimates from the numbers you entered.</p>
    </div>
  );
}
