import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

/** Where the person is on the journey (for the tracker). Called once in the background, never blocks a page. */
export async function GET() {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ loggedIn: false, hasCheck: false, hasPlan: false, ticked: 0 });
  const supabase = await createClient();
  const [{ count }, { data: plan }] = await Promise.all([
    supabase.from("financial_assessments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("financial_plans").select("steps_done").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return NextResponse.json({ loggedIn: true, hasCheck: (count ?? 0) > 0, hasPlan: Boolean(plan), ticked: Array.isArray(plan?.steps_done) ? plan.steps_done.length : 0 });
}
