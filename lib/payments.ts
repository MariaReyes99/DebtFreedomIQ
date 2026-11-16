import Stripe from "stripe";
import { adminClient } from "./supabase/server";
import type { Country } from "./countries";

/**
 * Payment provider abstraction.
 *  PAYMENTS_MODE=mock   (default) → no real payment; the mock checkout page grants access.
 *  PAYMENTS_MODE=stripe           → Stripe Checkout + webhook (see app/api/stripe/webhook).
 */
const stripeKey = () => process.env.STRIPE_SECRET_KEY?.match(/sk_(test|live)_[A-Za-z0-9]+/)?.[0];
export const paymentsMode = () => (process.env.PAYMENTS_MODE?.trim().startsWith("stripe") && stripeKey() ? "stripe" : "mock");

export type PaidTier = "premium" | "premium_plus";
export const priceFor = (c: Country, tier: PaidTier) => (tier === "premium" ? c.premiumPrice : c.plusPrice);

export async function grantSubscription(o: { userId: string; tier: PaidTier; provider: "mock" | "stripe" | "waiver"; ref: string; amount: number; currency: string; periodEnd?: Date | null; saveDemoCard?: boolean; testNoCard?: boolean }) {
  const db = adminClient();
  const { data, error } = await db.from("subscriptions").insert({
    user_id: o.userId, tier: o.tier, status: "active", provider: o.provider, provider_ref: o.ref,
    amount: o.amount, currency: o.currency, current_period_end: o.periodEnd ? o.periodEnd.toISOString() : null,
  }).select("id").single();
  if (error || !data) return false; // duplicate provider_ref → already granted
  if (o.amount > 0 && !o.testNoCard) await db.from("payments").insert({ user_id: o.userId, subscription_id: data.id, amount: o.amount, currency: o.currency, status: "paid", provider: o.provider, description: o.tier === "premium" ? "Premium (one-time)" : "Premium Plus — first month" });
  if (o.saveDemoCard && !o.testNoCard) {
    // Demo checkout uses the test card; keep it on file (brand + last 4 only) so renewals work
    const { count } = await db.from("payment_methods").select("id", { count: "exact", head: true }).eq("user_id", o.userId);
    if (!count) await db.from("payment_methods").insert({ user_id: o.userId, provider: "mock", brand: "visa", last4: "4242", exp_month: 12, exp_year: 2034 });
  }
  return true;
}

export function stripe() {
  return new Stripe(stripeKey()!);
}

/** Stripe Checkout — used only when PAYMENTS_MODE=stripe. */
export async function createStripeCheckout(o: { userId: string; email?: string; customerId?: string; country: Country; tier: PaidTier; origin: string }) {
  const amount = Math.round(priceFor(o.country, o.tier) * 100);
  const recurring = o.tier === "premium_plus";
  const session = await stripe().checkout.sessions.create({
    mode: recurring ? "subscription" : "payment",
    client_reference_id: o.userId,
    ...(o.customerId ? { customer: o.customerId } : { customer_email: o.email }),
    metadata: { user_id: o.userId, tier: o.tier, country: o.country.code },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: o.country.currency, unit_amount: amount,
        ...(recurring ? { recurring: { interval: "month" as const } } : {}),
        product_data: { name: recurring ? "DebtFreedomIQ Premium Plus" : "DebtFreedomIQ Premium — Freedom Plan report" },
      },
    }],
    success_url: `${o.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${o.origin}/pricing?cancelled=1`,
  });
  return session.url!;
}

/** Testing: subscribe without a card. On in demo mode, or anywhere with ALLOW_TEST_SUBSCRIBE=true. */
export function testSubscribeAllowed() {
  return paymentsMode() === "mock" || process.env.ALLOW_TEST_SUBSCRIBE === "true";
}
