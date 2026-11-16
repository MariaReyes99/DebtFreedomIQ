import { cookies } from "next/headers";
import { adminClient } from "./supabase/server";
import { SUPABASE_SECRET, SUPABASE_URL } from "./env";

export type EventName =
  | "landing_view" | "assessment_started" | "assessment_completed" | "signup" | "login"
  | "help_view" | "premium_view" | "checkout_started" | "purchase" | "plan_generated"
  | "brief_generated" | "plus_waitlist" | "plan_question";

/** Server-side product analytics. Never throws. */
export async function track(name: EventName, opts: { userId?: string | null; country?: string | null; props?: Record<string, unknown> } = {}) {
  if (!SUPABASE_SECRET || !SUPABASE_URL) return;
  try {
    const anon = (await cookies()).get("dfiq_anon")?.value ?? null;
    await adminClient().from("events").insert({ name, anon_id: anon, user_id: opts.userId ?? null, country: opts.country ?? null, props: opts.props ?? null });
  } catch { /* ignore */ }
}
