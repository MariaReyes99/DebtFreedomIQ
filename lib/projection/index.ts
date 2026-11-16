import type { AssessmentInput } from "../types";
import { toHousehold } from "../library";
import { projectHousehold, type HouseholdInput } from "./household";

export type LongView = {
  years10: { age: number; netWorth: number; liquid: number };
  retirement: { age: number; netWorth: number; liquid: number };
  moneyRunsOutAge: number | null;
  chanceLasts: number;   // share of simulated markets where spending is always covered
};

/** 10-year and retirement picture (expected returns, today's money) using the Library's engine. */
export function longView(i: AssessmentInput, ages: { age: number; retireAge?: number }, monteCarlo = true): LongView | null {
  try {
    const r = projectHousehold(toHousehold(i, ages) as HouseholdInput, { monteCarlo });
    const exp = r.scenarios[1].series;
    const at = (age: number) => exp.find(p => p.age >= age) ?? exp[exp.length - 1];
    const p10 = at(ages.age + 10), pr = at(r.retirementAge);
    return {
      years10: { age: p10.age, netWorth: Math.round(p10.netWorth), liquid: Math.round(p10.liquid) },
      retirement: { age: pr.age, netWorth: Math.round(pr.netWorth), liquid: Math.round(pr.liquid) },
      moneyRunsOutAge: r.scenarios[1].shortfallAge,
      chanceLasts: r.monteCarlo.successRate,
    };
  } catch (e) {
    console.error("[longView]", (e as Error).message);
    return null;
  }
}
