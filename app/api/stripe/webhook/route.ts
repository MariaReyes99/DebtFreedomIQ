import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, grantSubscription, type PaidTier } from "@/lib/payments";
import { adminClient } from "@/lib/supabase/server";
import { track } from "@/lib/events";

/** Stripe webhook (only used when PAYMENTS_MODE=stripe). */
export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  let event: Stripe.Event;
  try { event = stripe().webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature")!, process.env.STRIPE_WEBHOOK_SECRET.match(/whsec_[A-Za-z0-9]+/)?.[0] ?? process.env.STRIPE_WEBHOOK_SECRET); }
  catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const userId = s.metadata?.user_id || s.client_reference_id;
    const tier = (s.metadata?.tier === "premium_plus" ? "premium_plus" : "premium") as PaidTier;
    if (userId && (s.payment_status === "paid" || s.mode === "subscription")) {
      const periodEnd = tier === "premium_plus" ? new Date(Date.now() + 32 * 864e5) : null;
      const ok = await grantSubscription({ userId, tier, provider: "stripe", ref: (s.subscription as string) || s.id, amount: s.amount_total ?? 0, currency: s.currency ?? "", periodEnd });
      if (ok) await track("purchase", { userId, country: s.metadata?.country, props: { tier, amount: s.amount_total, currency: s.currency, mode: "stripe" } });
    }
  }
  if (event.type === "invoice.paid") {
    const inv = event.data.object as Stripe.Invoice & { subscription?: string };
    const end = inv.lines?.data?.[0]?.period?.end;
    if (inv.subscription && end) await adminClient().from("subscriptions").update({ status: "active", current_period_end: new Date(end * 1000).toISOString() }).eq("provider_ref", inv.subscription);
  }
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await adminClient().from("subscriptions").update({ status: "cancelled" }).eq("provider_ref", sub.id);
  }
  return NextResponse.json({ received: true });
}
