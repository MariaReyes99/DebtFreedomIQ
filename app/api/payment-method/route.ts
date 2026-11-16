import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { stripe, getOrCreateCustomer } from "@/lib/stripe";

/** Opens Stripe Checkout in "setup" mode to save a card for later (no charge). */
export async function POST(req: NextRequest) {
  const { user, profile, country } = await getSession();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  if (!user) return NextResponse.redirect(new URL("/login?next=/account?tab=payment", origin), 303);
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "setup",
      currency: country?.currency ?? "nzd",
      customer: await getOrCreateCustomer(user, profile?.full_name),
      success_url: `${origin}/account?tab=payment&card=saved`,
      cancel_url: `${origin}/account?tab=payment`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch (e) {
    console.error("setup error", e);
    return NextResponse.redirect(new URL("/account?tab=payment&card=error", origin), 303);
  }
}
