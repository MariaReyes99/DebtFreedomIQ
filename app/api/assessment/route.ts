import { NextResponse } from "next/server";
import { sanitize, evaluate, saveAssessment } from "@/lib/assessment";
import { matchHelp } from "@/lib/help";
import { getSession } from "@/lib/session";
import { track } from "@/lib/events";

/** POST /api/assessment — calculate scores + recommendations; saves when logged in. */
export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const input = sanitize(body);
  if (!input.incomes.some(i => i.amount > 0) && !input.expenses.some(e => e.amount > 0)) {
    return NextResponse.json({ error: "Please enter at least your income or your expenses." }, { status: 400 });
  }
  const { user } = await getSession();
  const { metrics, advice, country } = await evaluate(input);
  const assessmentId = user ? await saveAssessment(user.id, input, metrics, advice, country) : null;
  await track("assessment_completed", {
    userId: user?.id, country: country.code,
    props: { health: metrics.healthScore, stress: metrics.stressScore, debtTypes: [...new Set(input.debts.filter(d => d.balance > 0).map(d => d.type))], saved: Boolean(assessmentId), ai: advice.source },
  });
  return NextResponse.json({ metrics, advice, help: matchHelp(input, metrics), saved: Boolean(assessmentId), assessmentId });
}
