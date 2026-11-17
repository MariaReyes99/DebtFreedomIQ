/**
 * Crisis access: when someone tells us they're in crisis, the help that gets them to a person
 * (support team, referral package, readiness checklist, hardship letter) is free. We help people
 * in crisis; we don't charge them for it.
 */
import type { AssessmentInput } from "./types";

export const CRISIS_TRIGGERS = [
  ["cantAffordFood", "struggling to afford food"],
  ["lostIncome", "lost your job or income"],
  ["collectionsOrCourt", "debt collector or court notices"],
  ["housingAtRisk", "rent or mortgage arrears, or at risk of losing your home"],
  ["disconnection", "a power, water or phone disconnection notice"],
] as const;

/** The crisis situations this person ticked, in plain words. Empty if none. */
export function crisisReasons(i: AssessmentInput | null | undefined): string[] {
  if (!i?.situation) return [];
  const s = i.situation as Record<string, boolean | undefined>;
  return CRISIS_TRIGGERS.filter(([k]) => s[k]).map(([, label]) => label);
}

/** Free Premium for people who can't afford it ("Can't afford it? Get it free"). On unless HARDSHIP_WAIVER=false. */
export const waiverEnabled = () => process.env.HARDSHIP_WAIVER !== "false";
