import Stripe from "stripe";
import { adminClient } from "./supabase/server";
import type { Country } from "./countries";

/**
 * Payment provider abstraction.
 *  PAYMENTS_MODE=mock   (default) → no real payment; the mock checkout page grants access.
 *  PAYMENTS_MODE=stripe           → Stripe Checkout + webhook (see app/api/stripe/webhook).
 */
export const paymentsMode = () => (process.env.PAYMENTS_MODE === "stripe" && process.env.STRIPE_SECRET_KEY ? "stripe" : "mock");

export type PaidTier = "premium" | "premium_plus";
export const priceFor = (c: Country, tier: PaidTier) => (tier === "premium" ? c.premiumPrice : c.plusPrice);

export async function grantSubscription(o: { userId: string; tier: PaidTier; provider: "mock" | "stripe" | "waiver"; ref: string; amount: number; currency: string; periodEnd?: Date | null }) {
  const { error } = await adminClient().from("subscriptions").insert({
    user_id: o.userId, tier: o.tier, status: "active", provider: o.provider, provider_ref: o.ref,
    amount: o.amount, currency: o.currency, current_period_end: o.periodEnd ? o.periodEnd.toISOString() : null,
  });
  return !error; // duplicate provider_ref → already granted
}

export function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

/** Stripe Checkout — used only when PAYMENTS_MODE=stripe. */
export async function createStripeCheckout(o: { userId: string; email?: string; country: Country; tier: PaidTier; origin: string }) {
  const amount = Math.round(priceFor(o.country, o.tier) * 100);
  const recurring = o.tier === "premium_plus";
  const session = await stripe().checkout.sessions.create({
    mode: recurring ? "subscription" : "payment",
    client_reference_id: o.userId,
    customer_email: o.email,
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
