import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { paymentsMode, grantSubscription, createStripeCheckout, priceFor, testSubscribeAllowed, type PaidTier } from "@/lib/payments";
import { track } from "@/lib/events";

/** POST /api/checkout { tier } → { url }. Mock mode grants access immediately. */
export async function POST(req: Request) {
  const { user, country, displayCountry, tier: current } = await getSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { tier: raw, noCard: rawNoCard } = await req.json().catch(() => ({}));
  const noCard = rawNoCard === true && testSubscribeAllowed();
  const tier: PaidTier = raw === "premium_plus" ? "premium_plus" : "premium";
  if (tier === "premium" && current !== "free") return NextResponse.json({ url: "/plan" });
  const c = country ?? displayCountry;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  await track("checkout_started", { userId: user.id, country: c.code, props: { tier, mode: paymentsMode() } });

  if (paymentsMode() === "stripe" && !noCard) {
    try { return NextResponse.json({ url: await createStripeCheckout({ userId: user.id, email: user.email, country: c, tier, origin }) }); }
    catch (e) { console.error(e); return NextResponse.json({ error: "Payment could not start. Please try again." }, { status: 500 }); }
  }
  // MOCK: no money moves. Replace with Stripe by setting PAYMENTS_MODE=stripe.
  const amount = Math.round(priceFor(c, tier) * 100);
  const ref = `${noCard ? "test" : "mock"}_${crypto.randomUUID()}`;
  const periodEnd = tier === "premium_plus" ? new Date(Date.now() + 30 * 864e5) : null;
  const ok = await grantSubscription({ userId: user.id, tier, provider: "mock", ref, amount, currency: c.currency, periodEnd, saveDemoCard: true, testNoCard: noCard });
  if (!ok) return NextResponse.json({ error: "Couldn't activate Premium. Is the database set up?" }, { status: 500 });
  await track("purchase", { userId: user.id, country: c.code, props: { tier, amount, currency: c.currency, mode: noCard ? "test_no_card" : "mock" } });
  return NextResponse.json({ url: `/checkout/success?tier=${tier}&mock=1` });
}
