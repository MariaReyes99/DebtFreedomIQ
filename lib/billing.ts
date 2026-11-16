import "server-only";
import Stripe from "stripe";
import { adminClient } from "./supabase/server";
import { COUNTRIES, DEFAULT_COUNTRY, money, toCountryCode } from "./countries";
import { paymentsMode, stripe } from "./payments";
import { sendEmail } from "./email";
import { track } from "./events";

export type Card = { id: string; brand: string; last4: string; expMonth: number; expYear: number; provider: "mock" | "stripe" };
export type Sub = {
  id: string; user_id: string; tier: "premium" | "premium_plus"; status: "active" | "past_due" | "cancelled" | "expired";
  provider: string; provider_ref: string | null; amount: number | null; currency: string | null;
  current_period_end: string | null; past_due_since: string | null; last_reminder_at: string | null; reminders_sent: number;
  created_at: string; cancelled_at: string | null;
};
const PERIOD_DAYS = 30;
const REMINDER_DAYS = [0, 3, 7];   // days after going on hold
const EXPIRE_AFTER_DAYS = 30;       // on hold this long → ended

// ── Cards ──────────────────────────────────────────────────────────────
async function stripeCustomer(userId: string, email?: string) {
  const db = adminClient();
  const { data } = await db.from("profiles").select("stripe_customer_id").eq("id", userId).maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id as string;
  const c = await stripe().customers.create({ email, metadata: { user_id: userId } });
  await db.from("profiles").update({ stripe_customer_id: c.id }).eq("id", userId);
  return c.id;
}

export async function listCards(userId: string): Promise<Card[]> {
  if (paymentsMode() === "stripe") {
    const { data } = await adminClient().from("profiles").select("stripe_customer_id").eq("id", userId).maybeSingle();
    if (!data?.stripe_customer_id) return [];
    const pms = await stripe().paymentMethods.list({ customer: data.stripe_customer_id, type: "card" });
    return pms.data.map(p => ({ id: p.id, brand: p.card?.brand ?? "card", last4: p.card?.last4 ?? "????", expMonth: p.card?.exp_month ?? 0, expYear: p.card?.exp_year ?? 0, provider: "stripe" }));
  }
  const { data } = await adminClient().from("payment_methods").select("*").eq("user_id", userId).order("created_at");
  return (data ?? []).map(p => ({ id: p.id, brand: p.brand, last4: p.last4, expMonth: p.exp_month, expYear: p.exp_year, provider: "mock" }));
}

const luhn = (n: string) => { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = +n[i]; if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; };
const brandOf = (n: string) => /^4/.test(n) ? "visa" : /^(5[1-5]|2[2-7])/.test(n) ? "mastercard" : /^3[47]/.test(n) ? "amex" : "card";

/** Demo mode: validate and save brand/last4/expiry only. */
export async function addMockCard(userId: string, number: string, exp: string) {
  const n = number.replace(/\D/g, "");
  const m = exp.match(/(\d{1,2})\s*\/\s*(\d{2,4})/);
  if (n.length < 13 || n.length > 19 || !luhn(n)) return { error: "That card number doesn't look right. For testing, use 4242 4242 4242 4242." };
  if (!m) return { error: "Enter the expiry as MM / YY." };
  const month = +m[1], year = +m[2] < 100 ? 2000 + +m[2] : +m[2];
  if (month < 1 || month > 12 || new Date(year, month) < new Date()) return { error: "That card has expired." };
  const { error } = await adminClient().from("payment_methods").insert({ user_id: userId, provider: "mock", brand: brandOf(n), last4: n.slice(-4), exp_month: month, exp_year: year });
  return error ? { error: "Couldn't save the card." } : { ok: true };
}

/** Stripe mode: hosted page to add a card (no charge). */
export async function stripeAddCardUrl(userId: string, email: string | undefined, origin: string, currency: string) {
  const s = await stripe().checkout.sessions.create({
    mode: "setup", currency, customer: await stripeCustomer(userId, email),
    success_url: `${origin}/account?tab=billing&card=added`, cancel_url: `${origin}/account?tab=billing`,
  });
  return s.url!;
}

export async function deleteCard(userId: string, cardId: string) {
  if (paymentsMode() === "stripe") {
    const pm = await stripe().paymentMethods.retrieve(cardId);
    const { data } = await adminClient().from("profiles").select("stripe_customer_id").eq("id", userId).maybeSingle();
    if (pm.customer !== data?.stripe_customer_id) return { error: "Card not found." };
    await stripe().paymentMethods.detach(cardId);
    return { ok: true };
  }
  const { error } = await adminClient().from("payment_methods").delete().eq("id", cardId).eq("user_id", userId);
  return error ? { error: "Couldn't remove the card." } : { ok: true };
}

// ── Subscriptions ──────────────────────────────────────────────────────
export async function getSubs(userId: string): Promise<Sub[]> {
  const { data } = await adminClient().from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []) as Sub[];
}

/** Unsubscribe: Premium access ends now. */
export async function cancelSub(userId: string, subId: string) {
  const db = adminClient();
  const { data: sub } = await db.from("subscriptions").select("*").eq("id", subId).eq("user_id", userId).maybeSingle();
  if (!sub) return { error: "Subscription not found." };
  if (sub.provider === "stripe" && sub.provider_ref?.startsWith("sub_")) {
    try { await stripe().subscriptions.cancel(sub.provider_ref); } catch (e) { console.error("[billing] stripe cancel", (e as Error).message); }
  }
  await db.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", subId);
  await track("subscription_cancelled", { userId, props: { tier: sub.tier, provider: sub.provider } });
  return { ok: true };
}

/** Charge a saved card for one billing period (demo mode). */
async function chargeMock(sub: Sub, description: string) {
  const db = adminClient();
  const end = new Date(Date.now() + PERIOD_DAYS * 864e5).toISOString();
  await db.from("payments").insert({ user_id: sub.user_id, subscription_id: sub.id, amount: sub.amount ?? 0, currency: sub.currency, status: "paid", provider: "mock", description });
  await db.from("subscriptions").update({ status: "active", current_period_end: end, past_due_since: null, reminders_sent: 0, last_reminder_at: null }).eq("id", sub.id);
}

/** "Pay now" for a subscription that's on hold. Needs a saved card. */
export async function payNow(userId: string, subId: string) {
  const { data: sub } = await adminClient().from("subscriptions").select("*").eq("id", subId).eq("user_id", userId).maybeSingle();
  if (!sub || sub.status !== "past_due") return { error: "Nothing to pay." };
  if (paymentsMode() === "stripe") return { error: "Use “Update card & pay” to pay securely with Stripe." };
  const cards = await listCards(userId);
  if (!cards.length) return { error: "Add a card first, then pay." };
  await chargeMock(sub as Sub, "Premium Plus — overdue payment");
  await track("purchase", { userId, props: { tier: sub.tier, renewal: true, recovered: true } });
  return { ok: true };
}

// ── Daily billing job (demo mode; Stripe handles its own renewals) ─────
export async function runBilling(opts: { simulateDue?: boolean } = {}) {
  const db = adminClient();
  const now = Date.now();
  const report = { renewed: 0, putOnHold: 0, reminders: 0, expired: 0 };
  const { data: subs } = await db.from("subscriptions").select("*").eq("tier", "premium_plus").eq("provider", "mock").in("status", ["active", "past_due"]);
  for (const sub of (subs ?? []) as Sub[]) {
    const due = opts.simulateDue || (sub.current_period_end && new Date(sub.current_period_end).getTime() <= now);
    if (sub.status === "active" && due) {
      const cards = await listCards(sub.user_id);
      if (cards.length) { await chargeMock(sub, "Premium Plus — monthly renewal"); report.renewed++; continue; }
      await db.from("payments").insert({ user_id: sub.user_id, subscription_id: sub.id, amount: sub.amount ?? 0, currency: sub.currency, status: "failed", provider: "mock", description: "Renewal failed — no card on file" });
      await db.from("subscriptions").update({ status: "past_due", past_due_since: new Date().toISOString(), reminders_sent: 0 }).eq("id", sub.id);
      sub.status = "past_due"; sub.past_due_since = new Date().toISOString(); sub.reminders_sent = 0;
      report.putOnHold++;
      await track("subscription_on_hold", { userId: sub.user_id });
    }
    if (sub.status === "past_due" && sub.past_due_since) {
      const days = (now - new Date(sub.past_due_since).getTime()) / 864e5;
      if (days >= EXPIRE_AFTER_DAYS) { await db.from("subscriptions").update({ status: "expired" }).eq("id", sub.id); report.expired++; continue; }
      const nextReminderDay = REMINDER_DAYS[sub.reminders_sent];
      if (nextReminderDay !== undefined && days >= nextReminderDay) {
        await sendPaymentReminder(sub);
        await db.from("subscriptions").update({ reminders_sent: sub.reminders_sent + 1, last_reminder_at: new Date().toISOString() }).eq("id", sub.id);
        report.reminders++;
      }
    }
  }
  return report;
}

async function sendPaymentReminder(sub: Sub) {
  const db = adminClient();
  const { data: p } = await db.from("profiles").select("email,full_name,country").eq("id", sub.user_id).maybeSingle();
  if (!p?.email) return;
  const c = COUNTRIES[toCountryCode(p.country) ?? DEFAULT_COUNTRY];
  const amount = money(c, (sub.amount ?? 0) / 100, 2);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const deadline = new Date(new Date(sub.past_due_since!).getTime() + EXPIRE_AFTER_DAYS * 864e5).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
  await sendEmail({
    to: p.email,
    subject: "Action needed: your DebtFreedomIQ Premium Plus payment",
    html: `<p>Hi ${p.full_name || "there"},</p>
<p>We couldn't take your Premium Plus payment of <strong>${amount}</strong> because there's no card on your account. Your Premium features are <strong>on hold</strong> until the payment is made.</p>
<p><a href="${site}/account?tab=billing" style="background:#13a796;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:600">Add a card &amp; pay</a></p>
<p>If you don't pay by ${deadline}, your subscription will end. Your free Financial Health check stays available either way.</p>
<p>Don't want Premium Plus any more? You can cancel in My Account → Plan &amp; billing.</p>
<p>DebtFreedomIQ</p>`,
  });
  await track("payment_reminder_sent", { userId: sub.user_id, props: { reminder: sub.reminders_sent + 1 } });
}

// ── Stripe webhook helpers ─────────────────────────────────────────────
export async function markStripeSub(ref: string, status: Sub["status"], periodEnd?: number) {
  const patch: Record<string, unknown> = { status };
  if (status === "past_due") patch.past_due_since = new Date().toISOString();
  if (status === "active") Object.assign(patch, { past_due_since: null, reminders_sent: 0 });
  if (periodEnd) patch.current_period_end = new Date(periodEnd * 1000).toISOString();
  await adminClient().from("subscriptions").update(patch).eq("provider_ref", ref);
}

export async function stripePortalUrl(userId: string, email: string | undefined, origin: string) {
  const s = await stripe().billingPortal.sessions.create({ customer: await stripeCustomer(userId, email), return_url: `${origin}/account?tab=billing` });
  return s.url;
}
export type { Stripe };
