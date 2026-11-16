import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/session";

/** POST /api/assessment/steps { assessmentId, done: number[] } — save ticked next steps. */
export async function POST(req: Request) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { assessmentId, done } = await req.json().catch(() => ({}));
  const clean = (Array.isArray(done) ? done : []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 20).slice(0, 20);
  const supabase = await createClient();
  const { error } = await supabase.from("financial_assessments").update({ completed_steps: clean }).eq("id", assessmentId).eq("user_id", user.id);
  return error ? NextResponse.json({ error: "Couldn't save" }, { status: 500 }) : NextResponse.json({ ok: true });
}
