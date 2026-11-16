import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { stripe, getOrCreateCustomer } from "@/lib/stripe";

/** Stripe-hosted page to update/remove cards and download receipts. */
export async function POST(req: NextRequest) {
  const { user, profile } = await getSession();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  if (!user) return NextResponse.redirect(new URL("/login?next=/account?tab=payment", origin), 303);
  try {
    const portal = await stripe().billingPortal.sessions.create({
      customer: await getOrCreateCustomer(user, profile?.full_name),
      return_url: `${origin}/account?tab=payment`,
    });
    return NextResponse.redirect(portal.url, 303);
  } catch (e) {
    console.error("portal error", e);
    return NextResponse.redirect(new URL("/account?tab=payment&card=portal", origin), 303);
  }
}
