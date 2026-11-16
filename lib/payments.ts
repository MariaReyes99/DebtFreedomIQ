import Stripe from "stripe";
import { adminClient } from "./supabase/server";
import { SUPABASE_SECRET, SUPABASE_PUBLIC_KEY } from "./env";
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

type GrantOpts = { userId: string; tier: PaidTier; provider: "mock" | "stripe" | "waiver"; ref: string; amount: number; currency: string; periodEnd?: Date | null; saveDemoCard?: boolean; testNoCard?: boolean };

/** Plain-English reason the server can't write to the database (shown at checkout, logged in the terminal). */
export function secretKeyProblem(): string | null {
  const k = SUPABASE_SECRET;
  if (!k) return "SUPABASE_SECRET_KEY is missing from .env.local. Add the secret key from Supabase → Project Settings → API Keys, then restart npm run dev.";
  if (k === SUPABASE_PUBLIC_KEY || k.startsWith("sb_publishable_")) return "SUPABASE_SECRET_KEY in .env.local is the publishable key. Use the secret key (starts with sb_secret_) from Supabase → Project Settings → API Keys, then restart npm run dev.";
  if (k.startsWith("eyJ")) {
    try { const role = JSON.parse(Buffer.from(k.split(".")[1], "base64url").toString()).role; if (role !== "service_role") return "SUPABASE_SERVICE_ROLE_KEY in .env.local is the anon key. Use the service_role (secret) key, then restart npm run dev."; } catch { /* ignore */ }
  }
  return null;
}
function explain(msg: string) {
  if (/invalid api key|jwt|unauthor/i.test(msg)) return "Supabase rejected the secret key. Check SUPABASE_SECRET_KEY in .env.local belongs to this project, then restart npm run dev.";
  if (/row-level security|permission denied/i.test(msg)) return "The server key can't write to the database. SUPABASE_SECRET_KEY in .env.local must be the secret key, not the publishable one.";
  if (/does not exist|column|schema cache|violates check constraint/i.test(msg)) return "The database is missing the latest changes. Run supabase/schema.sql again in the Supabase SQL Editor (it's safe to re-run).";
  if (/foreign key/i.test(msg)) return "Your login isn't in this Supabase project. Log out, log in again, and try once more.";
  return `Database error: ${msg}`;
}

export async function grantSubscriptionDetailed(o: GrantOpts): Promise<{ ok: boolean; error?: string }> {
  const keyIssue = secretKeyProblem();
  if (keyIssue) { console.error("[checkout]", keyIssue); return { ok: false, error: keyIssue }; }
  const db = adminClient();
  const { data, error } = await db.from("subscriptions").insert({
    user_id: o.userId, tier: o.tier, status: "active", provider: o.provider, provider_ref: o.ref,
    amount: o.amount, currency: o.currency, current_period_end: o.periodEnd ? o.periodEnd.toISOString() : null,
  }).select("id").single();
  if (error || !data) {
    console.error("[checkout] couldn't save subscription:", error?.message);
    return { ok: false, error: error?.code === "23505" ? "This payment was already recorded." : explain(error?.message ?? "unknown") };
  }
  if (o.amount > 0 && !o.testNoCard) await db.from("payments").insert({ user_id: o.userId, subscription_id: data.id, amount: o.amount, currency: o.currency, status: "paid", provider: o.provider, description: o.tier === "premium" ? "Premium (one-time)" : "Premium Plus — first month" });
  if (o.saveDemoCard && !o.testNoCard) {
    // Demo checkout uses the test card; keep it on file (brand + last 4 only) so renewals work
    const { count } = await db.from("payment_methods").select("id", { count: "exact", head: true }).eq("user_id", o.userId);
    if (!count) await db.from("payment_methods").insert({ user_id: o.userId, provider: "mock", brand: "visa", last4: "4242", exp_month: 12, exp_year: 2034 });
  }
  return { ok: true };
}

export async function grantSubscription(o: GrantOpts) {
  return (await grantSubscriptionDetailed(o)).ok; // false also for duplicate provider_ref → already granted
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
