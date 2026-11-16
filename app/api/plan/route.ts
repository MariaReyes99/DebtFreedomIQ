import type { Goal } from "@/lib/types";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { makePlan, defaultGoals } from "@/lib/plan-server";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/events";

/** POST /api/plan — generate (or regenerate) and save a Freedom Plan. Premium only. */
export async function POST(req: Request) {
  const { user, isPremium } = await getSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (!isPremium) return NextResponse.json({ error: "My Freedom Plan is a Premium feature." }, { status: 402 });
  const body = await req.json().catch(() => ({}));
  const strategy = body.strategy === "snowball" ? "snowball" : "avalanche";
  const latest = await loadLatest(user.id);
  if (!latest) return NextResponse.json({ error: "Complete your Financial Health check first." }, { status: 400 });
  if (latest.incomplete) return NextResponse.json({ error: "Your last check was saved without its debts. Please redo your Financial Health check first." }, { status: 400 });

  const plan = await makePlan(latest.input, latest.metrics, strategy);
  const supabase = await createClient();
  const { data: prev } = await supabase.from("financial_plans").select("goals").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  // Fresh targets from the latest numbers, plus any goals the person added themselves
  const fresh = defaultGoals(latest.input, latest.metrics, plan.scenarios);
  const own = ((prev?.goals as Goal[] | undefined) ?? []).filter(g => !fresh.some(f => f.title === g.title));
  const goals = [...fresh, ...own];
  const { data, error } = await supabase.from("financial_plans").insert({
    user_id: user.id, assessment_id: latest.id, strategy, scenarios: plan.scenarios, ai_summary: plan.summary, goals,
    title: `Freedom Plan — ${new Date().toLocaleDateString()}`,
  }).select("id,created_at").single();
  if (error) return NextResponse.json({ error: "Couldn't save your plan." }, { status: 500 });
  await track("plan_generated", { userId: user.id, country: latest.input.country, props: { strategy, ai: plan.summary.source } });
  return NextResponse.json({ id: data.id, createdAt: data.created_at, ...plan, goals });
}
