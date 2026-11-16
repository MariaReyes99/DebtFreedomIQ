"use server";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { assess, type CheckResult, type Flags } from "@/lib/health";
import { track } from "@/lib/events";
import { toCountryCode } from "@/lib/countries";

export type CheckState = { result?: CheckResult; error?: string; saved?: boolean; period?: string; medical?: boolean };
const num = (v: FormDataEntryValue | null) => Math.max(0, Number(String(v ?? "").replace(/[^\d.]/g, "")) || 0);

export async function saveCheck(_: CheckState, fd: FormData): Promise<CheckState> {
  // Anyone can do the check; it's only saved when logged in.
  const supabase = isConfigured() ? await createClient() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  const essentials = ["rent", "food", "utilities", "transport", "health", "childcare"].reduce((s, k) => s + num(fd.get(k)), 0);
  const flags: Flags = {
    cantAffordFood: !!fd.get("cantAffordFood"), housingAtRisk: !!fd.get("housingAtRisk"),
    courtOrCollection: !!fd.get("courtOrCollection"), behindOnBills: !!fd.get("behindOnBills"),
    creditForEssentials: !!fd.get("creditForEssentials"), distressed: !!fd.get("distressed"),
    medicalDebt: !!fd.get("medicalDebt"),
  };
  const input = { income: num(fd.get("income")), essentials, debtRepayments: num(fd.get("debtRepayments")), other: num(fd.get("other")), totalDebt: num(fd.get("totalDebt")), flags };
  const result = assess(input);
  const country = toCountryCode(String(fd.get("country") || ""));
  const period = fd.get("period") === "fortnight" ? "fortnight" : "month";

  if (supabase && user) await supabase.from("health_checks").insert({
    user_id: user.id, country, period, income: input.income, essentials, debt_repayments: input.debtRepayments,
    other: input.other, total_debt: input.totalDebt, flags, level: result.level,
  });
  await track("check_completed", { userId: user?.id, country, props: { level: result.level, saved: Boolean(user) } });
  return { result, saved: Boolean(user), period, medical: flags.medicalDebt };
}
