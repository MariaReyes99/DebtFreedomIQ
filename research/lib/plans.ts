/**
 * Library question allowances by DebtFreedomIQ plan. There is one subscription:
 * DebtFreedomIQ's. Allowances run in 30-day windows.
 */
export type Plan = 'free' | 'premium' | 'plus';

export interface PlanInfo {
  label: string;
  monthlyQuestions: number;
  /** Save, compare, download and print plans in My retirement picture. */
  savedPlans: boolean;
}

export const PLANS: Record<Plan, PlanInfo> = {
  free: { label: 'Free', monthlyQuestions: 5, savedPlans: false },
  premium: { label: 'Premium', monthlyQuestions: 20, savedPlans: false },
  plus: { label: 'Premium Plus', monthlyQuestions: 300, savedPlans: true },
};

/** Questions a month for visitors who aren't logged in (counted by hashed IP). */
export const ANONYMOUS_MONTHLY_QUESTIONS = 2;

export function canSavePlans(plan: Plan): boolean {
  return PLANS[plan].savedPlans;
}
