import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanRow = {
  id: string; created_at: string; updated_at: string; strategy: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scenarios: any; ai_summary: any; goals: any; choices?: unknown; steps_done?: unknown;
};
const BASE = "id,created_at,updated_at,strategy,scenarios,ai_summary,goals";

/** Latest Freedom Plan. Works on databases without the newest columns (choices, steps_done). */
export async function latestPlan(supabase: SupabaseClient, userId: string): Promise<PlanRow | null> {
  const q = (cols: string) => supabase.from("financial_plans").select(cols).eq("user_id", userId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const full = await q(`${BASE},choices,steps_done`);
  if (!full.error) return (full.data as unknown as PlanRow) ?? null;
  console.error("[plan] reading without choices/steps_done:", full.error.message);
  const basic = await q(BASE);
  return (basic.data as unknown as PlanRow) ?? null;
}
