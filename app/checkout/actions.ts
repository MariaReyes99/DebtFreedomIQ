"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { detectedCountryRaw } from "@/lib/geo";
import { COUNTRIES, toCountryCode } from "@/lib/countries";
import { paymentsMode, grantSubscription, createStripeCheckout, priceFor, type PaidTier } from "@/lib/payments";
import { track } from "@/lib/events";
import type { AuthState } from "@/app/auth/actions";
import { friendly } from "@/lib/auth-errors";

const site = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** One step: create the account AND pay for Premium. */
export async function signUpAndPay(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "The app isn't connected to Supabase yet." };
  const email = String(fd.get("email") || "").trim();
  const password = String(fd.get("password") || "");
  const full_name = String(fd.get("full_name") || "").trim();
  const code = toCountryCode(String(fd.get("country") || ""));
  const tier: PaidTier = fd.get("tier") === "premium_plus" ? "premium_plus" : "premium";
  if (!email || password.length < 8) return { error: "Please enter your email and a password of at least 8 characters." };
  if (!code) return { error: "Please choose your country." };
  if (!fd.get("consent")) return { error: "Please confirm you understand DebtFreedomIQ gives general information, not financial advice." };
  const c = COUNTRIES[code];

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name, country: code, signup_country: await detectedCountryRaw() }, emailRedirectTo: `${site()}/auth/callback?next=/plan` },
  });
  if (error) return { error: friendly(error) };
  // Supabase hides "already registered" when email confirmation is on: the user comes back with no identities
  if (!data.user || data.user.identities?.length === 0) return { error: "This email already has an account. Please log in, then you'll go straight to checkout." };
  (await cookies()).set("country", code, { path: "/", maxAge: 31536000, sameSite: "lax" });
  await track("signup", { userId: data.user.id, country: code, props: { via: "checkout", tier } });
  await track("checkout_started", { userId: data.user.id, country: code, props: { tier, mode: paymentsMode(), combined: true } });

  if (paymentsMode() === "stripe") {
    const url = await createStripeCheckout({ userId: data.user.id, email, country: c, tier, origin: site() });
    redirect(url);
  }
  // Mock payment: grant immediately (no money moves)
  const amount = Math.round(priceFor(c, tier) * 100);
  await grantSubscription({ userId: data.user.id, tier, provider: "mock", ref: `mock_${crypto.randomUUID()}`, amount, currency: c.currency, periodEnd: tier === "premium_plus" ? new Date(Date.now() + 30 * 864e5) : null });
  await track("purchase", { userId: data.user.id, country: code, props: { tier, amount, currency: c.currency, mode: "mock", combined: true } });

  if (data.session) redirect(`/checkout/success?tier=${tier}&mock=1`);
  return { email, message: "Payment received and Premium is active. Confirm your email to open your Freedom Plan." };
}
