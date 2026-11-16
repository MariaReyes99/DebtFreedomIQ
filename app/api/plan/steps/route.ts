import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** POST /api/plan/steps { planId, done: string[] } — save which Freedom Plan steps are ticked off. */
export async function POST(req: Request) {
  const { user, isPremium } = await getSession();
  if (!user || !isPremium) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const done = Array.isArray(b.done) ? b.done.filter((x: unknown) => typeof x === "string").slice(0, 200).map((x: string) => x.slice(0, 120)) : [];
  const supabase = await createClient();
  const { error } = await supabase.from("financial_plans").update({ steps_done: done, updated_at: new Date().toISOString() }).eq("id", String(b.planId)).eq("user_id", user.id);
  return error ? NextResponse.json({ error: "Couldn't save." }, { status: 500 }) : NextResponse.json({ ok: true });
}
