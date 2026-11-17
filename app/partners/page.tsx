import Link from "next/link";
import { Button, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "For organisations", description: "Offer DebtFreedomIQ free to the people you support: financial mentors, community organisations, employers and banks' hardship teams." };

const WHO = [
  ["🤝", "Financial mentors & community services", "Clients arrive with their numbers, priorities and documents ready, so the first appointment starts with solutions, not paperwork."],
  ["🏦", "Banks & lenders' hardship teams", "“Before your hardship appointment, complete this check.” You receive a structured summary, priorities and a support plan, with the customer's consent."],
  ["🏢", "Employers", "A private financial wellbeing benefit. Staff get clarity and a plan; you never see anyone's personal finances."],
  ["🎓", "Universities, councils & iwi / community providers", "Free access codes for students, residents or whānau, with simple, anonymous reports on what help people need."],
] as const;

export default function Partners() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <PageHeader eyebrow="For organisations" title="Offer DebtFreedomIQ free to the people you support">
        Financial triage and decision support that gets people to the right help, prepared. You pay, so people under pressure never have to.
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2">
        {WHO.map(([icon, title, text]) => (
          <Card key={title}><p className="text-3xl" aria-hidden>{icon}</p><h2 className="mt-2 text-lg font-bold">{title}</h2><p className="mt-1 text-navy-700">{text}</p></Card>
        ))}
      </div>
      <Card className="mt-8">
        <h2 className="text-xl font-bold">What your people get</h2>
        <ul className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
          {["A free Financial Health check in about 10 minutes", "Urgent help first: food, bills, collectors, housing, lost income", "A dated plan out of debt", "Their support team, a referral package and a readiness checklist", "Decision support for property, investments and retirement", "Plain words, five countries, and a text-size switch"].map(x => <li key={x} className="flex gap-2"><span className="font-bold text-teal-600" aria-hidden>✓</span>{x}</li>)}
        </ul>
        <h2 className="mt-6 text-xl font-bold">What you get</h2>
        <ul className="mt-3 grid gap-2 text-[15px] sm:grid-cols-2">
          {["Access for everyone you support, under your name", "Anonymous reports: what situations people face and what help they need", "Clients who arrive prepared (with their consent)", "No advertising, no data selling, no bank logins"].map(x => <li key={x} className="flex gap-2"><span className="font-bold text-teal-600" aria-hidden>✓</span>{x}</li>)}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3"><Button href="/support?topic=partner">Talk to us about a partnership</Button><Button href="/health" variant="secondary">Try the free check yourself</Button></div>
      </Card>
      <p className="mt-6 text-sm text-navy-500">DebtFreedomIQ gives general information and decision support, not regulated financial advice. It works alongside free financial mentoring and counselling services and points people to them. <Link href="/about" className="underline">About &amp; privacy</Link>.</p>
    </div>
  );
}
