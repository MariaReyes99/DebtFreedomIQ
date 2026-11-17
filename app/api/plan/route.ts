import type { Goal } from "@/lib/types";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { makePlan, defaultGoals } from "@/lib/plan-server";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/events";
import { applyChoices, NO_CHOICES, type Choices } from "@/lib/whatif";
import { calculate } from "@/lib/finance";

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

  const supabase = await createClient();
  // Older databases may not have the choices/steps_done columns yet: fall back instead of failing
  let { data: prev, error: prevErr } = await supabase.from("financial_plans").select("goals,choices,steps_done").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (prevErr) ({ data: prev } = await supabase.from("financial_plans").select("goals").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle() as unknown as { data: typeof prev });
  // Choices from the Simulator (sent now, or kept from the last plan). The plan is built from the numbers after them.
  const choices: Choices = body.choices && typeof body.choices === "object" ? { ...NO_CHOICES, ...body.choices } : prev?.choices ? { ...NO_CHOICES, ...(prev.choices as Choices) } : NO_CHOICES;
  const afterInput = applyChoices(latest.input, choices).input;
  const afterMetrics = calculate(afterInput);
  const plan = await makePlan(afterInput, afterMetrics, strategy);
  // Fresh targets from the latest numbers, plus any goals the person added themselves
  const fresh = defaultGoals(afterInput, afterMetrics, plan.scenarios);
  const own = ((prev?.goals as Goal[] | undefined) ?? []).filter(g => !fresh.some(f => f.title === g.title));
  const goals = [...fresh, ...own];
  const row = { user_id: user.id, assessment_id: latest.id, strategy, scenarios: plan.scenarios, ai_summary: plan.summary, goals, title: `Freedom Plan — ${new Date().toLocaleDateString()}` };
  let { data, error } = await supabase.from("financial_plans").insert({ ...row, choices, steps_done: prev?.steps_done ?? [] }).select("id,created_at").single();
  let warning: string | undefined;
  if (error && /choices|steps_done|column|schema cache/i.test(error.message)) {
    console.error("[plan] database is missing the latest columns; saving without them:", error.message);
    ({ data, error } = await supabase.from("financial_plans").insert(row).select("id,created_at").single());
    warning = "Your plan is saved, but ticked steps and Explore my future choices can't be kept until the database is updated (run supabase/schema.sql again).";
  }
  if (error || !data) {
    console.error("[plan] couldn't save:", error?.message);
    const why = /permission denied/i.test(error?.message ?? "") ? "The database hasn't given the app permission to save plans. Run supabase/schema.sql again in the Supabase SQL Editor."
      : /does not exist|schema cache/i.test(error?.message ?? "") ? "The database is missing the latest changes. Run supabase/schema.sql again in the Supabase SQL Editor."
      : `Database error: ${error?.message ?? "unknown"}`;
    return NextResponse.json({ error: `Couldn't save your plan. ${why}` }, { status: 500 });
  }
  await track("plan_generated", { userId: user.id, country: latest.input.country, props: { strategy, ai: plan.summary.source } });
  return NextResponse.json({ id: data.id, createdAt: data.created_at, ...plan, goals, warning });
}
