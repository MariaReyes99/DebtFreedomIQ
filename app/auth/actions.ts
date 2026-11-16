"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient, adminClient, isConfigured } from "@/lib/supabase/server";
import { detectedCountryRaw, detectedPlace } from "@/lib/geo";
import { toCountryCode } from "@/lib/countries";
import { track } from "@/lib/events";

export type AuthState = { error?: string; message?: string };
const site = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const safeNext = (n: unknown, d = "/dashboard") => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : d);

export async function signUp(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "The app isn't connected to Supabase yet. Add the Supabase keys to .env.local." };
  const email = String(fd.get("email") || "").trim();
  const password = String(fd.get("password") || "");
  const full_name = String(fd.get("full_name") || "").trim();
  const country = toCountryCode(String(fd.get("country") || ""));
  if (!email || password.length < 8) return { error: "Please enter your email and a password of at least 8 characters." };
  if (!country) return { error: "Please choose your country." };
  if (!fd.get("consent")) return { error: "Please confirm you understand DebtFreedomIQ gives general information, not financial advice." };

  const ipCountry = await detectedCountryRaw();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name, country, signup_country: ipCountry }, emailRedirectTo: `${site()}/auth/callback?next=${encodeURIComponent(safeNext(fd.get("next"), "/health"))}` },
  });
  if (error) return { error: error.message };
  (await cookies()).set("country", country, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  await track("signup", { userId: data.user?.id, country, props: { ip_country: ipCountry } });
  if (data.session) redirect(safeNext(fd.get("next"), "/health"));
  return { message: "Check your email and click the link to confirm your account. Your Financial Health results will be saved when you come back." };
}

export async function signIn(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "The app isn't connected to Supabase yet. Add the Supabase keys to .env.local." };
  const email = String(fd.get("email") || "").trim();
  const password = String(fd.get("password") || "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password didn't match. Try again or reset your password." };

  const ipCountry = await detectedCountryRaw();
  try {
    const admin = adminClient();
    const { data: p } = await admin.from("profiles").select("country,city").eq("id", data.user.id).maybeSingle();
    const update: Record<string, unknown> = { last_login_country: ipCountry, last_login_at: new Date().toISOString() };
    // Remember the area they logged in from (used for "help near you") unless they've set their own town
    const place = await detectedPlace();
    if (!p?.city && place.city) Object.assign(update, { city: place.city, region: place.region, latitude: place.lat, longitude: place.lng });
    // first login with no country chosen yet: use the login location if supported
    if (!p?.country && toCountryCode(ipCountry)) update.country = toCountryCode(ipCountry);
    await admin.from("profiles").upsert({ id: data.user.id, email: data.user.email, ...update });
    const chosen = toCountryCode(p?.country) ?? toCountryCode(ipCountry);
    if (chosen) (await cookies()).set("country", chosen, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } catch { /* non-fatal */ }
  await track("login", { userId: data.user.id, country: ipCountry });
  redirect(safeNext(fd.get("next")));
}

export async function resetPassword(_: AuthState, fd: FormData): Promise<AuthState> {
  if (!isConfigured()) return { error: "Supabase isn't configured yet." };
  const email = String(fd.get("email") || "").trim();
  if (!email) return { error: "Enter your email above first." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${site()}/auth/callback?next=/reset-password` });
  return { message: "If that email has an account, a reset link is on its way." };
}
