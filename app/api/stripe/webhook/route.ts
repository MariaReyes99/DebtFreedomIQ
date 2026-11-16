import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, grantSubscription, type PaidTier } from "@/lib/payments";
import { adminClient } from "@/lib/supabase/server";
import { markStripeSub } from "@/lib/billing";
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
  // Renewals: Stripe charges the saved card each month and retries/emails if it fails
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const inv = event.data.object as Stripe.Invoice & { subscription?: string; parent?: { subscription_details?: { subscription?: string } } };
    const subRef = inv.subscription || inv.parent?.subscription_details?.subscription;
    const end = inv.lines?.data?.[0]?.period?.end;
    if (subRef) {
      await markStripeSub(subRef, event.type === "invoice.paid" ? "active" : "past_due", event.type === "invoice.paid" ? end : undefined);
      const { data: sub } = await adminClient().from("subscriptions").select("id,user_id").eq("provider_ref", subRef).maybeSingle();
      if (sub && inv.billing_reason !== "subscription_create") await adminClient().from("payments").insert({ user_id: sub.user_id, subscription_id: sub.id, amount: inv.amount_due ?? 0, currency: inv.currency, status: event.type === "invoice.paid" ? "paid" : "failed", provider: "stripe", description: "Premium Plus — monthly renewal" });
    }
  }
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await adminClient().from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("provider_ref", sub.id);
  }
  return NextResponse.json({ received: true });
}
