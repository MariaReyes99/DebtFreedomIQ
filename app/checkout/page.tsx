import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { money } from "@/lib/countries";
import { paymentsMode, testSubscribeAllowed } from "@/lib/payments";
import MockPaymentForm from "@/components/MockPaymentForm";
import CheckoutButton from "@/components/CheckoutButton";
import { Badge, Card } from "@/components/ui";

export const metadata = { title: "Checkout" };

import SignupAndPay from "@/components/SignupAndPay";

export default async function Checkout({ searchParams }: { searchParams: Promise<{ tier?: string }> }) {
  const { user, country, displayCountry, tier: current, geo } = await getSession();
  const { tier: raw } = await searchParams;
  const tier = raw === "premium_plus" ? "premium_plus" : "premium";
  if (tier === "premium" && current !== "free") redirect("/plan");
  const c = country ?? displayCountry;
  const price = tier === "premium" ? money(c, c.premiumPrice) : `${money(c, c.plusPrice)}/year`;
  return (
    <div className="mx-auto grid max-w-5xl items-start gap-6 px-4 py-12 md:grid-cols-[1fr_1.2fr]">
      <Card>
        <Badge tone="teal">Order summary</Badge>
        <h1 className="mt-3 text-2xl font-bold">{tier === "premium" ? "DebtFreedomIQ Premium" : "Premium Plus: Financial Simulator"}</h1>
        <p className="mt-1 text-navy-600">{tier === "premium" ? "One-time report. No subscription." : "Yearly. Cancel anytime."}</p>
        <ul className="mt-4 space-y-1.5 text-sm text-navy-700">{tier === "premium_plus" && <><li>✓ <strong>Financial Simulator</strong>: sell, buy, refinance, lump sums</li><li>✓ Net worth in 10 years &amp; at retirement</li><li>✓ Unlimited scenarios, side by side</li></>}<li>✓ My Freedom Plan (3 scenarios)</li><li>✓ Milestones, payoff order &amp; savings targets</li><li>✓ Find Help matching &amp; referral brief</li><li>✓ Templates &amp; PDF export</li></ul>
        <div className="mt-6 flex items-baseline justify-between border-t border-navy-100 pt-4"><span className="font-semibold">Total</span><span className="text-2xl font-bold">{price}</span></div>
        <p className="mt-1 text-right text-xs text-navy-500">{c.currency.toUpperCase()}, incl. any applicable taxes</p>
      </Card>
      <Card>
        {!user ? <SignupAndPay tier={tier} price={price} country={geo.code} mock={paymentsMode() === "mock"} allowNoCard={testSubscribeAllowed()} /> : (<>
          <h2 className="mb-4 text-lg font-bold">Payment</h2>
          {paymentsMode() === "mock" || testSubscribeAllowed() ? <MockPaymentForm tier={tier} label={`Pay ${price}`} allowNoCard={testSubscribeAllowed()} /> : <CheckoutButton tier={tier} label={`Continue to secure payment — ${price}`} />}
        </>)}
      </Card>
    </div>
  );
}
