import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadLatest } from "@/lib/assessment";
import { scenariosFor } from "@/lib/plan-server";
import { aiAnswer, aiEnabled } from "@/lib/ai";
import { COUNTRIES, DEFAULT_COUNTRY, toCountryCode } from "@/lib/countries";
import { track } from "@/lib/events";

/** POST /api/plan/ask — "What if…" questions about the plan (Premium, needs OpenAI). */
export async function POST(req: Request) {
  const { user, isPremium } = await getSession();
  if (!user || !isPremium) return NextResponse.json({ error: "Premium only." }, { status: 402 });
  const { question } = await req.json().catch(() => ({}));
  if (!question || String(question).trim().length < 5) return NextResponse.json({ error: "Please type a question." }, { status: 400 });
  const latest = await loadLatest(user.id);
  if (!latest) return NextResponse.json({ error: "Complete your Financial Health check first." }, { status: 400 });
  if (!aiEnabled()) return NextResponse.json({ answer: "The AI assistant isn't switched on yet (the site owner needs to add an OpenAI key). In the meantime, try the scenario cards above, or ask a free financial mentor/counsellor in Find Help." });
  const c = COUNTRIES[toCountryCode(latest.input.country) ?? DEFAULT_COUNTRY];
  const answer = await aiAnswer(String(question), latest.input, latest.metrics, c, scenariosFor(latest.input, latest.metrics, "avalanche"));
  await track("plan_question", { userId: user.id, country: c.code });
  return NextResponse.json({ answer: answer ?? "Sorry, I couldn't answer that right now. Please try again shortly." });
}
