import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { money } from "@/lib/countries";
import { paymentsMode } from "@/lib/payments";
import MockPaymentForm from "@/components/MockPaymentForm";
import CheckoutButton from "@/components/CheckoutButton";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "Checkout" };

export default async function Checkout({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  const { user, country, displayCountry, tier: current } = await getSession();
  const { tier: raw } = await searchParams;
  if (!user) redirect(`/signup?next=${encodeURIComponent(`/checkout?tier=${raw === "premium_plus" ? "premium_plus" : "premium"}`)}`);
  const tier = raw === "premium_plus" ? "premium_plus" : "premium";
  if (tier === "premium" && current !== "free") redirect("/plan");
  const c = country ?? displayCountry;
  const price = tier === "premium" ? money(c, c.premiumPrice) : `${money(c, c.plusPrice, 2)}/month`;
  return (
    <div className="mx-auto grid max-w-4xl gap-6 px-4 py-12 md:grid-cols-2">
      <Card>
        <Badge tone="teal">Order summary</Badge>
        <h1 className="mt-3 text-2xl font-bold">{tier === "premium" ? "DebtFreedomIQ Premium" : "Premium Plus"}</h1>
        <p className="mt-1 text-navy-600">{tier === "premium" ? "One-time report. No subscription." : "Monthly. Cancel anytime."}</p>
        <ul className="mt-4 space-y-1.5 text-sm text-navy-700"><li>✓ My Freedom Plan (3 scenarios)</li><li>✓ Milestones, payoff order &amp; savings targets</li><li>✓ Find Help matching &amp; referral brief</li><li>✓ Templates &amp; PDF export</li></ul>
        <div className="mt-6 flex items-baseline justify-between border-t border-navy-100 pt-4"><span className="font-semibold">Total</span><span className="text-2xl font-bold">{price}</span></div>
        <p className="mt-1 text-right text-xs text-navy-500">{c.currency.toUpperCase()}, incl. any applicable taxes</p>
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Payment</h2>
        {paymentsMode() === "mock" ? <MockPaymentForm tier={tier} label={`Pay ${price}`} /> : <CheckoutButton tier={tier} label={`Continue to secure payment — ${price}`} />}
      </Card>
    </div>
  );
}
