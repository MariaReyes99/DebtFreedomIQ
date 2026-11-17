import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { grantSubscription } from "@/lib/payments";
import { track } from "@/lib/events";
import { waiverEnabled } from "@/lib/crisis";

/** POST /api/waiver — "Can't afford it right now?" free Premium access (on unless HARDSHIP_WAIVER=false). */
export async function POST() {
  if (!waiverEnabled()) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const { user, country, tier } = await getSession();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  if (tier === "free") await grantSubscription({ userId: user.id, tier: "premium", provider: "waiver", ref: `waiver_${user.id}`, amount: 0, currency: country?.currency ?? "nzd" });
  await track("purchase", { userId: user.id, country: country?.code, props: { tier: "premium", waiver: true } });
  return NextResponse.json({ url: "/plan" });
}
