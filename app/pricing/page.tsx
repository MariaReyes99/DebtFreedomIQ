import { getSession } from "@/lib/session";
import { money } from "@/lib/countries";
import { paymentsMode } from "@/lib/payments";
import { track } from "@/lib/events";
import CheckoutButton from "@/components/CheckoutButton";
import WaitlistButton from "@/components/WaitlistButton";
import { Badge, Button, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Pricing" };

const Check = ({ children }: { children: React.ReactNode }) => <li className="flex gap-2"><span aria-hidden className="font-bold text-teal-600">✓</span><span>{children}</span></li>;

export default async function Pricing({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { user, country, displayCountry, tier } = await getSession();
  const { cancelled } = await searchParams;
  const c = country ?? displayCountry;
  await track("premium_view", { userId: user?.id, country: c.code, props: { page: "pricing" } });
  const waiver = process.env.HARDSHIP_WAIVER === "true";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader eyebrow="Pricing" title="Simple, fair pricing">Start free. Pay once only if your Freedom Plan is worth it to you. No subscription needed. Prices in {c.currency.toUpperCase()}.</PageHeader>
      {cancelled && <p className="mb-6 rounded-xl bg-amber-50 p-4 text-amber-900">Payment cancelled. You haven&apos;t been charged.</p>}
      {paymentsMode() === "mock" && <p className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800"><strong>Demo payments are on.</strong> Checkout won&apos;t take real money while the site is being tested.</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col">
          <h2 className="text-xl font-bold">Free</h2>
          <p className="mt-1 text-navy-600">Know where you stand.</p>
          <p className="mt-4 text-4xl font-bold">{money(c, 0)}</p><p className="text-sm text-navy-500">forever</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-[15px]"><Check>Financial Health dashboard</Check><Check>Health, Stress &amp; Emergency Fund scores</Check><Check>Net worth &amp; debt-to-income ratio</Check><Check>Top 5 recommendations &amp; next steps</Check><Check>Types of help + free support directory</Check></ul>
          <Button href="/health" variant="secondary" size="lg" full className="mt-6">{user ? "Go to Financial Health" : "Start free"}</Button>
        </Card>

        <Card className="relative flex flex-col border-2 border-teal-500 shadow-xl shadow-teal-900/10">
          <Badge tone="teal" className="absolute -top-3 left-6">Most popular</Badge>
          <h2 className="text-xl font-bold">Premium</h2>
          <p className="mt-1 text-navy-600">Your personalised road to freedom.</p>
          <p className="mt-4 text-4xl font-bold">{money(c, c.premiumPrice)}</p><p className="text-sm text-navy-500">one-time report · no subscription</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-[15px]"><Check><strong>My Freedom Plan</strong> with 3 AI scenarios</Check><Check>Debt-free timeline &amp; monthly milestones</Check><Check>Payoff order &amp; savings targets</Check><Check>Goals tracker + &quot;what if&quot; questions</Check><Check>Find Help matching &amp; referral brief</Check><Check>Contact &amp; hardship letter templates</Check><Check>PDF export</Check></ul>
          <div className="mt-6">
            {tier !== "free" ? <Button href="/plan" size="lg" full>Open My Freedom Plan</Button>
              : <Button href="/checkout?tier=premium" size="lg" full>{`Get Premium — ${money(c, c.premiumPrice)}`}</Button>}
            {tier === "free" && !user && <p className="mt-2 text-center text-xs text-navy-500">Create your account and pay in one step.</p>}
            {waiver && tier === "free" && user && <div className="mt-3 text-center"><p className="text-xs text-navy-500">Can&apos;t afford it right now?</p><CheckoutButton endpoint="/api/waiver" label="Get it free" variant="ghost" /></div>}
          </div>
        </Card>

        <Card className="flex flex-col bg-navy-950 text-white">
          <div className="flex items-center gap-2"><h2 className="text-xl font-bold">Premium Plus</h2><Badge tone="teal">{process.env.PREMIUM_PLUS_ENABLED === "true" ? "New" : "Coming soon"}</Badge></div>
          <p className="mt-1 text-navy-200">Stay on track, month after month.</p>
          <p className="mt-4 text-4xl font-bold">{money(c, c.plusPrice, 2)}</p><p className="text-sm text-navy-300">per month · cancel anytime</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-[15px] text-navy-100"><Check>Everything in Premium</Check><Check>Ongoing progress tracking</Check><Check>Monthly plan recalculation</Check><Check>Progress monitoring &amp; reminders</Check></ul>
          <div className="mt-6">{process.env.PREMIUM_PLUS_ENABLED === "true"
            ? (tier === "premium_plus" ? <Button href="/account?tab=billing" size="lg" full variant="secondary">Manage subscription</Button> : <Button href="/checkout?tier=premium_plus" size="lg" full variant="secondary">Subscribe — {money(c, c.plusPrice, 2)}/month</Button>)
            : <WaitlistButton />}</div>
        </Card>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {[["Why one-time?", "People under financial stress don't need another subscription. You pay once, only after you've seen your free results."],
          ["Is my data safe?", "Your data is private to your account, protected by row-level security, and never sold. We never ask for bank logins."],
          ["Is this financial advice?", "No. DebtFreedomIQ gives general information and planning tools. For personal advice, use a licensed adviser. Find Help shows you how to check."]].map(([q, a]) => (
          <div key={q}><h3 className="font-bold">{q}</h3><p className="mt-1 text-sm text-navy-600">{a}</p></div>
        ))}
      </div>
    </div>
  );
}
