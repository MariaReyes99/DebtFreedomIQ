import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadLatest, fmtFor } from "@/lib/assessment";
import { aiReferralBrief } from "@/lib/ai";
import { matchHelp, fallbackBrief } from "@/lib/help";
import { COUNTRIES, DEFAULT_COUNTRY, toCountryCode } from "@/lib/countries";
import { track } from "@/lib/events";

/** POST /api/help/brief — personalised referral brief + matches (Premium). */
export async function POST() {
  const { user, isPremium, profile } = await getSession();
  if (!user || !isPremium) return NextResponse.json({ error: "Premium only." }, { status: 402 });
  const latest = await loadLatest(user.id);
  if (!latest) return NextResponse.json({ error: "Complete your Financial Health check first." }, { status: 400 });
  const c = COUNTRIES[toCountryCode(latest.input.country) ?? DEFAULT_COUNTRY];
  const ai = await aiReferralBrief(latest.input, latest.metrics, c);
  const fb = fallbackBrief(latest.input, latest.metrics, c, fmtFor(c), profile?.full_name);
  const out = ai ?? { brief: fb.brief, emailTemplate: fb.emailTemplate, matches: matchHelp(latest.input, latest.metrics).map(m => ({ ...m, questionsToAsk: [] as string[] })) };
  await track("brief_generated", { userId: user.id, country: c.code, props: { ai: Boolean(ai), categories: out.matches.map(m => m.category) } });
  return NextResponse.json({ ...out, source: ai ? "openai" : "rules" });
}
