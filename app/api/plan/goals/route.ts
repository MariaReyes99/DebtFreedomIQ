import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Goal } from "@/lib/types";

/** POST /api/plan/goals — save the goals tracker for a plan. */
export async function POST(req: Request) {
  const { user, isPremium } = await getSession();
  if (!user || !isPremium) return NextResponse.json({ error: "Premium only." }, { status: 402 });
  const { planId, goals } = await req.json().catch(() => ({}));
  const clean: Goal[] = (Array.isArray(goals) ? goals : []).slice(0, 20).map((g: Goal) => ({
    id: String(g.id).slice(0, 24), title: String(g.title || "Goal").slice(0, 80),
    target: Math.max(0, Number(g.target) || 0), current: Math.max(0, Number(g.current) || 0), due: g.due ? String(g.due).slice(0, 10) : undefined,
  }));
  const supabase = await createClient();
  const { error } = await supabase.from("financial_plans").update({ goals: clean, updated_at: new Date().toISOString() }).eq("id", planId).eq("user_id", user.id);
  return error ? NextResponse.json({ error: "Couldn't save goals." }, { status: 500 }) : NextResponse.json({ ok: true, goals: clean });
}
