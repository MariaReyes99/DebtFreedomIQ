import { cookies } from "next/headers";
import { after } from "next/server";
import { adminClient } from "./supabase/server";
import { SUPABASE_SECRET, SUPABASE_URL } from "./env";

export type EventName =
  | "landing_view" | "assessment_started" | "assessment_completed" | "signup" | "login"
  | "help_view" | "premium_view" | "checkout_started" | "purchase" | "plan_generated"
  | "brief_generated" | "plus_waitlist" | "plan_question"
  | "subscription_cancelled" | "subscription_on_hold" | "payment_reminder_sent" | "card_added" | "card_deleted";

/**
 * Server-side product analytics. Never throws and never slows the page:
 * the database write runs after the response has been sent.
 */
export async function track(name: EventName, opts: { userId?: string | null; country?: string | null; props?: Record<string, unknown> } = {}) {
  if (!SUPABASE_SECRET || !SUPABASE_URL) return;
  let anon: string | null = null;
  try { anon = (await cookies()).get("dfiq_anon")?.value ?? null; } catch { /* outside a request (e.g. cron) */ }
  const write = async () => {
    try { await adminClient().from("events").insert({ name, anon_id: anon, user_id: opts.userId ?? null, country: opts.country ?? null, props: opts.props ?? null }); } catch { /* ignore */ }
  };
  try { after(write); } catch { void write(); }
}
