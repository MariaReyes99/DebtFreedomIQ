import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { calculate } from "@/lib/finance";
import { exampleFor } from "@/lib/mock-data";
import { money } from "@/lib/countries";
import { track } from "@/lib/events";
import Steps from "@/components/Steps";
import { Badge, Button, Card, ScoreRing } from "@/components/ui";

const AUDIENCES = [
  { img: "/images/worried-about-bills.jpg", alt: "A woman reviewing bills at her kitchen bench", t: "Individuals with debt", d: "Credit cards, loans, BNPL: see which to tackle first and how fast you can clear them." },
  { img: "/images/couple-reviewing-bills.jpg", alt: "A couple with their baby reviewing paperwork", t: "Mortgage holders", d: "Find out when you could be mortgage-free and whether extra repayments make sense." },
  { img: "/images/parent-with-children.jpg", alt: "A parent with two young children at home", t: "Families", d: "Protect the essentials, build a buffer and plan for what matters most." },
  { img: "/images/community-together.jpg", alt: "A group of people joining hands", t: "Property investors", d: "Model leverage and cash flow across properties and spot risk early." },
];

export default async function Home() {
  const { user, country, displayCountry, geo } = await getSession();
  const c = country ?? displayCountry;
  await track("landing_view", { userId: user?.id, country: country?.code ?? geo.detected });
  const demo = calculate(exampleFor(c.code));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(19,167,150,0.35),transparent_55%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <Badge tone="teal">AI-powered financial decisions</Badge>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">From financial stress to <span className="text-teal-300">financial freedom.</span></h1>
            <p className="mt-5 max-w-xl text-lg text-navy-100"><strong className="text-white">See the result of every move before you make it.</strong> Start with your free Financial Health check, then test your options: sell or keep, refinance, use savings, and see your debts, net worth and retirement change.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link href="/health" className="group rounded-2xl bg-teal-500 p-4 text-white shadow-lg shadow-teal-900/30 hover:bg-teal-600">
                <p className="text-sm font-semibold text-teal-50">I&apos;m struggling with money</p>
                <p className="mt-1 text-lg font-bold">Get my free check &amp; help →</p>
                <p className="mt-1 text-xs text-teal-50">10 minutes · free forever · find support near you</p>
              </Link>
              <Link href="/whatif" className="group rounded-2xl bg-white/10 p-4 text-white ring-1 ring-white/20 hover:bg-white/15">
                <p className="text-sm font-semibold text-navy-200">I want to plan my next move</p>
                <p className="mt-1 text-lg font-bold">Try the Financial Simulator →</p>
                <p className="mt-1 text-xs text-navy-200">Property, debt, savings &amp; retirement in one model</p>
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-navy-200"><li>✓ Free check forever</li><li>✓ No bank logins</li><li>✓ You decide; we calculate</li></ul>
          </div>
          <div className="relative">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl ring-1 ring-white/10">
              <Image src="/images/family-kitchen-table.jpg" alt="A mother working on a laptop at the kitchen table while her children eat breakfast" fill priority className="object-cover" sizes="(min-width:1024px) 50vw, 100vw" />
            </div>
            <Card className="absolute -bottom-8 left-4 right-4 flex items-center gap-4 text-navy-900 sm:left-auto sm:right-6 sm:w-80">
              <ScoreRing value={demo.healthScore} label="Health score" sub={demo.healthBand} size={96} />
              <div className="text-sm"><p className="text-navy-500">Example family</p><p className="font-bold">Net worth {money(c, demo.netWorth)}</p><p className="text-navy-600">Debt-to-income {(demo.debtToIncome * 100).toFixed(0)}%</p></div>
            </Card>
          </div>
        </div>
      </section>

      <div className="mt-8"><Steps /></div>

      {/* Three pillars */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-3xl font-bold tracking-tight">Everything you need to answer: <span className="text-teal-600">&quot;What happens if I…?&quot;</span></h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { tag: "Free", tone: "green" as const, t: "Financial Health", d: "Your Financial Health, Stress and Emergency Fund scores, net worth, debt-to-income ratio, charts and your top 5 recommendations.", href: "/health", cta: "Start free" },
            { tag: "Free + Premium", tone: "teal" as const, t: "Find Help", d: "See which professionals can help, from free budget advisers to mortgage advisers and lawyers. Premium adds matching and a referral brief.", href: "/help", cta: "Explore help" },
            { tag: "Premium", tone: "navy" as const, t: "My Freedom Plan", d: "Conservative, Balanced and Aggressive scenarios with your debt-free date, monthly milestones, savings targets and a PDF.", href: "/plan", cta: "See example" },
            { tag: "Premium Plus", tone: "navy" as const, t: "Financial Simulator", d: "Sell a rental, use shares to clear a card, refinance, buy or invest. Compare scenarios side by side: cash flow, interest, debt-free date, net worth in 10 years and at retirement.", href: "/whatif", cta: "Try a what-if" },
          ].map(p => (
            <Card key={p.t} className="flex flex-col">
              <Badge tone={p.tone}>{p.tag}</Badge>
              <h3 className="mt-3 text-xl font-bold">{p.t}</h3>
              <p className="mt-2 flex-1 text-navy-600">{p.d}</p>
              <Link href={p.href} className="mt-4 font-semibold text-teal-700 hover:underline">{p.cta} →</Link>
            </Card>
          ))}
        </div>
      </section>

      {/* Who it's for */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-3xl font-bold tracking-tight">Built for real households</h2>
          <p className="mt-2 max-w-2xl text-navy-600">Whether you have {money(c, 0)} net worth and a credit card balance, or a property portfolio with cash-flow pressure, you&apos;re asking the same question.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCES.map(a => (
              <article key={a.t} className="overflow-hidden rounded-2xl border border-navy-100 bg-navy-50">
                <div className="relative aspect-[3/2]"><Image src={a.img} alt={a.alt} fill className="object-cover" sizes="(min-width:1024px) 25vw, 50vw" /></div>
                <div className="p-4"><h3 className="font-bold">{a.t}</h3><p className="mt-1 text-sm text-navy-600">{a.d}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <Card className="grid items-center gap-6 bg-gradient-to-br from-teal-500 to-teal-700 text-white md:grid-cols-[1fr_auto] md:p-10">
          <div>
            <h2 className="text-3xl font-bold">Start free. Pay once if it helps.</h2>
            <p className="mt-2 max-w-2xl text-teal-50">Your Financial Health dashboard is free forever. Unlock My Freedom Plan with a one-time Premium report for {money(c, c.premiumPrice)}. No subscription.</p>
          </div>
          <div className="flex flex-wrap gap-3"><Button href="/health" variant="dark" size="lg">Get my free score</Button><Button href="/pricing" variant="secondary" size="lg">See pricing</Button></div>
        </Card>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-7xl px-4 pb-8">
        <div className="grid gap-6 md:grid-cols-3">
          {[["🔒 Private by design", "Your data is yours. Row-level security, no bank logins, never sold to lenders."], ["🤝 Judgement-free", "Financial hardship isn't a personal failure. We focus on the next step, not the past."], ["🧭 Honest guidance", "General information and tools, with clear pointers to free and licensed professional help."]].map(([t, d]) => (
            <div key={t}><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm text-navy-600">{d}</p></div>
          ))}
        </div>
      </section>
    </>
  );
}
