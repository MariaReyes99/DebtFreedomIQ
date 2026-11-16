import Stripe from "stripe";
import { adminClient } from "./supabase/server";
import { track } from "./events";

export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

/** Idempotently unlock the plan for a paid Checkout Session. */
export async function fulfil(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return false;
  const userId = session.metadata?.user_id || session.client_reference_id;
  if (!userId) return false;
  const admin = adminClient();
  if (session.metadata?.kind === "donation") {
    const { error } = await admin.from("purchases").insert({
      user_id: userId, stripe_session_id: session.id, amount: session.amount_total,
      currency: session.currency, country: session.metadata?.country ?? null, kind: "donation",
    });
    if (!error) await track("donation", { userId, country: session.metadata?.country, props: { amount: session.amount_total, currency: session.currency } });
    return false; // donations never unlock the plan
  }
  const { error } = await admin.from("purchases").insert({
    user_id: userId, stripe_session_id: session.id, amount: session.amount_total,
    currency: session.currency, country: session.metadata?.country ?? null,
  });
  await admin.from("profiles").update({ plan_paid: true, plan_paid_at: new Date().toISOString() }).eq("id", userId);
  if (!error) await track("purchase", { userId, country: session.metadata?.country, props: { amount: session.amount_total, currency: session.currency } });
  return true;
}

/** Returns the user's Stripe customer id, creating one the first time. */
export async function getOrCreateCustomer(user: { id: string; email?: string }, name?: string | null) {
  const admin = adminClient();
  const { data } = await admin.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;
  const customer = await stripe().customers.create({ email: user.email, name: name ?? undefined, metadata: { user_id: user.id } });
  await admin.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", user.id);
  return customer.id;
}
