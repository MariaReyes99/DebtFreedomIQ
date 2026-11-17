import { getSession, adminClient } from "@/lib/session";
import { isConfigured } from "@/lib/supabase/server";
import { money } from "@/lib/countries";
import { paymentsMode, plusEnabled } from "@/lib/payments";
import { track } from "@/lib/events";
import { waiverEnabled } from "@/lib/crisis";
import { PLANS as LIBRARY } from "@/research/lib/plans";
import CheckoutButton from "@/components/CheckoutButton";
import WaitlistButton from "@/components/WaitlistButton";
import { Badge, Button, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Pricing", description: "Start free. Pay once for your Freedom Plan, or yearly for decision support on big money choices. Crisis support is always free." };

const Check = ({ children }: { children: React.ReactNode }) => <li className="flex gap-2"><span aria-hidden className="font-bold text-teal-600">✓</span><span>{children}</span></li>;

async function stories() {
  if (!isConfigured()) return [];
  try {
    const { data } = await adminClient().from("testimonials").select("display_name,country,story,outcome").eq("approved", true).eq("consent", true).order("created_at", { ascending: false }).limit(3);
    return data ?? [];
  } catch { return []; }
}

export default async function Pricing({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { user, country, displayCountry, tier } = await getSession();
  const { cancelled } = await searchParams;
  const c = country ?? displayCountry;
  await track("premium_view", { userId: user?.id, country: c.code, props: { page: "pricing" } });
  const waiver = waiverEnabled();
  const quotes = await stories();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <PageHeader eyebrow="Pricing" title="Clarity, options and a pathway to help">
        Start free. Pay once for your plan, or yearly for decision support on big money choices. Prices in {c.currency.toUpperCase()}. Crisis support is always free.
      </PageHeader>
      {cancelled && <p className="mb-6 rounded-xl bg-amber-50 p-4 text-amber-900">Payment cancelled. You haven&apos;t been charged.</p>}
      {paymentsMode() === "mock" && <p className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800"><strong>Demo payments are on.</strong> Checkout won&apos;t take real money while the site is being tested.</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col">
          <h2 className="text-xl font-bold">Free</h2>
          <p className="mt-1 text-navy-600">Know where you stand, and who can help today.</p>
          <p className="mt-4 text-4xl font-bold">{money(c, 0)}</p><p className="text-sm text-navy-500">forever</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
            <Check>See your whole money picture in about 10 minutes: what comes in, what goes out, and how long your savings last</Check>
            <Check>Know what to do first, in plain words</Check>
            <Check>Find free help near you, sorted by what&apos;s most urgent, with phone numbers</Check>
            <Check>Send a hardship letter to a lender or provider</Check>
            <Check>See where your money could take you by retirement</Check>
            <Check>Ask the library {LIBRARY.free.monthlyQuestions} investing or retirement questions a month, with sources</Check>
          </ul>
          <Button href="/health" variant="secondary" size="lg" full className="mt-6">{user ? "Check my finances" : "Start free"}</Button>
        </Card>

        <Card className="relative flex flex-col border-2 border-teal-500 shadow-xl shadow-teal-900/10">
          <Badge tone="teal" className="absolute -top-3 left-6">Pay once · no subscription</Badge>
          <h2 className="text-xl font-bold">Premium</h2>
          <p className="mt-1 text-navy-600">Your road out of debt, step by step.</p>
          <p className="mt-4 text-4xl font-bold">{money(c, c.premiumPrice)}</p><p className="text-sm text-navy-500">one-time</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-[15px]">
            <Check><strong>A dated plan</strong>: what to do this week, this month, and until you&apos;re debt-free</Check>
            <Check>Know which debt to pay first and how much interest you save</Check>
            <Check><strong>Know exactly who to contact</strong> and what to bring before you speak to an expert</Check>
            <Check>One file with your numbers, matches and checklist, ready for your appointment</Check>
            <Check>See how becoming debt-free changes under one different decision</Check>
            <Check>Track your progress and goals; print or save as PDF</Check>
            <Check>{LIBRARY.premium.monthlyQuestions} library questions a month</Check>
          </ul>
          <div className="mt-6">
            {tier !== "free" ? <Button href="/plan" size="lg" full>Open My plan</Button>
              : <Button href="/checkout?tier=premium" size="lg" full>{`Get Premium — ${money(c, c.premiumPrice)}`}</Button>}
            {tier === "free" && !user && <p className="mt-2 text-center text-xs text-navy-500">Create your account and pay in one step.</p>}
            {waiver && tier === "free" && user && <div className="mt-3 text-center"><p className="text-xs text-navy-500">Can&apos;t afford it right now?</p><CheckoutButton endpoint="/api/waiver" label="Get it free" variant="ghost" /></div>}
            {waiver && tier === "free" && !user && <p className="mt-2 text-center text-xs text-navy-500">Can&apos;t afford it? Log in and choose &quot;Get it free&quot;.</p>}
          </div>
        </Card>

        <Card className="flex flex-col bg-navy-950 text-white">
          <div className="flex items-center gap-2"><h2 className="text-xl font-bold">Premium Plus</h2><Badge tone="teal">{plusEnabled() ? "Decision support" : "Coming soon"}</Badge></div>
          <p className="mt-1 text-navy-200">For the big decisions: see the result before you make the move.</p>
          <p className="mt-4 text-4xl font-bold">{money(c, c.plusPrice)}</p><p className="text-sm text-navy-300">per year · cancel anytime</p>
          <ul className="mt-6 flex-1 space-y-2.5 text-[15px] text-navy-100">
            <Check>Everything in Premium</Check>
            <Check><strong className="text-white">Compare selling, refinancing, renting out, downsizing or restructuring</strong> side by side, before you decide</Check>
            <Check>See which option closes your monthly gap, lowers your risk and leaves you better off in 10 years</Check>
            <Check>Use shares, savings or {c.code === "NZ" ? "KiwiSaver" : "retirement savings"} wisely, and see what it does to retirement</Check>
            <Check>Save, compare and print retirement plans; compare fund fees</Check>
            <Check>{LIBRARY.plus.monthlyQuestions} library questions a month</Check>
          </ul>
          <p className="mt-4 text-xs text-navy-300">An adviser session can cost far more. Use this to prepare, so that time goes further.</p>
          <div className="mt-4">{plusEnabled()
            ? (tier === "premium_plus" ? <Button href="/whatif" size="lg" full variant="secondary">Open Explore my future</Button> : <Button href="/checkout?tier=premium_plus" size="lg" full variant="secondary">{`Get Premium Plus — ${money(c, c.plusPrice)}/year`}</Button>)
            : <WaitlistButton />}</div>
        </Card>
      </div>

      <Card className="mt-8 border-teal-300 bg-teal-50">
        <div className="flex flex-wrap items-center gap-4">
          <span aria-hidden className="text-4xl">💚</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-teal-900">In crisis? Your support is free.</h2>
            <p className="mt-1 text-teal-900">If you tell us in your check that you can&apos;t afford food, have lost your job, have had a disconnection notice, debt collector or court letters, or rent or mortgage arrears, your support team, referral package, checklist and hardship letter are free. No payment, no catch.</p>
          </div>
          <Button href="/health">Start my free check</Button>
        </div>
      </Card>

      {quotes.length > 0 && (
        <section aria-labelledby="stories" className="mt-12">
          <h2 id="stories" className="text-2xl font-bold">In their words</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            {quotes.map((q, k) => (
              <Card key={k} as="article">
                {q.outcome && <p className="font-bold text-teal-800">{q.outcome}</p>}
                <blockquote className="mt-2 text-navy-700">&ldquo;{q.story}&rdquo;</blockquote>
                <p className="mt-3 text-sm text-navy-500">— {q.display_name || "A DebtFreedomIQ user"}{q.country ? `, ${q.country}` : ""}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[["Why pay once for Premium?", "People under financial stress don't need another subscription. You see your free results first, then pay once if the plan will help."],
          ["Is my data safe?", "Your data is private to your account and never sold. We never ask for bank logins. You can download or delete everything at any time."],
          ["Is this financial advice?", "No. It's general information and decision support. For personal advice, use a licensed adviser or a free financial mentor: Get help shows you how."],
          ["For organisations", "Financial mentors, community groups, employers and banks' hardship teams can offer DebtFreedomIQ free to the people they support."]].map(([q, a]) => (
          <div key={q}><h3 className="font-bold">{q}</h3><p className="mt-1 text-sm text-navy-600">{a}{q === "For organisations" && <> <a href="/partners" className="font-semibold text-teal-700 underline">Find out more</a>.</>}</p></div>
        ))}
      </div>
    </div>
  );
}
