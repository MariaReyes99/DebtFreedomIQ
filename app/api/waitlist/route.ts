import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { track } from "@/lib/events";

/** POST /api/waitlist — register interest in Premium Plus (monthly tracking). */
export async function POST() {
  const { user, country } = await getSession();
  await track("plus_waitlist", { userId: user?.id, country: country?.code });
  return NextResponse.json({ ok: true });
}
