import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { loadLatest } from "@/lib/assessment";

/** Save age / retirement age onto the latest health check, so it's never asked again. */
export async function POST(req: Request) {
  const { user } = await getSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const age = Number(b.age), retireAge = Number(b.retireAge);
  if (!(age >= 16 && age <= 100)) return NextResponse.json({ error: "Enter an age between 16 and 100." }, { status: 400 });
  const latest = await loadLatest(user.id);
  if (!latest) return NextResponse.json({ error: "Do your Financial Health check first." }, { status: 400 });
  const input = { ...latest.input, age: Math.round(age), ...(retireAge >= 40 && retireAge <= 90 ? { retireAge: Math.round(retireAge) } : {}) };
  const supabase = await createClient();
  const { error } = await supabase.from("financial_assessments").update({ input }).eq("id", latest.id).eq("user_id", user.id);
  return error ? NextResponse.json({ error: "Couldn't save." }, { status: 500 }) : NextResponse.json({ ok: true });
}
