"use server";
import { redirect } from "next/navigation";
import { createClient, adminClient } from "@/lib/supabase/server";
import { track } from "@/lib/events";
import type { Debt } from "@/lib/plan";

export async function saveDebts(debts: Debt[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const clean = debts.slice(0, 50).map(d => ({
    user_id: user.id, name: String(d.name || "Debt").slice(0, 80),
    balance: Math.max(0, +d.balance || 0), rate: Math.min(1000, Math.max(0, +d.rate || 0)), minimum: Math.max(0, +d.minimum || 0),
  }));
  await supabase.from("debts").delete().eq("user_id", user.id);
  if (clean.length) await supabase.from("debts").insert(clean);
  return { ok: true };
}

/** "Can't afford it?" — grants the plan free, logged separately from purchases. */
export async function claimWaiver(fd: FormData) {
  if (process.env.HARDSHIP_WAIVER === "false") redirect("/plan");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/plan");
  await adminClient().from("profiles").update({ plan_waiver: true }).eq("id", user.id);
  await track("hardship_waiver", { userId: user.id, country: String(fd.get("country") || "") || null });
  redirect("/plan");
}
