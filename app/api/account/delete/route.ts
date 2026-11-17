import { NextResponse } from "next/server";
import { getSession, adminClient } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { cancelSub } from "@/lib/billing";
import { paymentsMode, stripe } from "@/lib/payments";

/**
 * POST /api/account/delete { confirm: "DELETE" }
 * Stops any renewals, removes saved cards at Stripe, then deletes the login. The database removes
 * everything linked to it (checks, plans, debts, assets, subscriptions, payments) automatically.
 */
export async function POST(req: Request) {
  const { user, profile } = await getSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { confirm } = await req.json().catch(() => ({}));
  if (confirm !== "DELETE") return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });
  const db = adminClient();
  const { data: subs } = await db.from("subscriptions").select("id,status").eq("user_id", user.id);
  for (const s of subs ?? []) if (s.status === "active" || s.status === "past_due") await cancelSub(user.id, s.id);
  const customer = (profile as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
  if (customer && paymentsMode() === "stripe") {
    try { await stripe().customers.del(customer); } catch (e) { console.error("[account delete] stripe", (e as Error).message); }
  }
  await db.from("support_messages").update({ user_id: null }).eq("user_id", user.id);
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account delete]", error.message);
    return NextResponse.json({ error: "We couldn't delete your account just now. Please contact support." }, { status: 500 });
  }
  try { await (await createClient()).auth.signOut(); } catch { /* already gone */ }
  return NextResponse.json({ ok: true });
}
