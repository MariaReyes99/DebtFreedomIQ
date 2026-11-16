import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { stripe, getOrCreateCustomer } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const { user, country } = await getSession();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  if (!user) return NextResponse.redirect(new URL("/login?next=/plan", origin), 303);
  if (!country) return NextResponse.redirect(new URL("/#check", origin), 303);
  const fd = await req.formData();
  const amount = Math.round(Number(String(fd.get("amount") || "").replace(/[^\d.]/g, "")) || 0);
  const min = country.code === "PH" ? 50 : 1;
  const max = country.code === "PH" ? 50000 : 1000;
  if (amount < min || amount > max) return NextResponse.redirect(new URL(`/plan?donate=invalid#support`, origin), 303);
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      customer: await getOrCreateCustomer(user),
      metadata: { user_id: user.id, country: country.code, kind: "donation" },
      submit_type: "donate",
      line_items: [{ quantity: 1, price_data: { currency: country.currency, unit_amount: amount * 100, product_data: { name: "Donation to DebtFreedomIQ", description: "Helps keep the health check and help directory free" } } }],
      success_url: `${origin}/plan?donate=thanks#support`,
      cancel_url: `${origin}/plan#support`,
    });
    return NextResponse.redirect(session.url!, 303);
  } catch (e) {
    console.error("donate error", e);
    return NextResponse.redirect(new URL("/plan?donate=error#support", origin), 303);
  }
}
