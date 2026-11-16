import { cache } from "react";
import { createClient, adminClient, isConfigured } from "./supabase/server";
import { currentCountry } from "./geo";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "./countries";

export type Tier = "free" | "premium" | "premium_plus";
export type Profile = { id: string; email: string | null; full_name: string | null; country: string | null; city?: string | null; region?: string | null; latitude?: number | null; longitude?: number | null };

export const getSession = cache(async () => {
  let user: { id: string; email?: string } | null = null;
  let profile: Profile | null = null;
  let tier: Tier = "free";
  let onHold: { id: string; tier: string; amount: number | null; currency: string | null } | null = null;
  if (isConfigured()) {
    const supabase = await createClient();
    // Verify the login token (locally when possible) instead of asking Supabase on every page
    try {
      const { data } = await supabase.auth.getClaims();
      const cl = data?.claims;
      user = cl?.sub ? { id: cl.sub, email: typeof cl.email === "string" ? cl.email : undefined } : null;
    } catch { user = null; }
    if (user) {
      const [{ data: p }, { data: subs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("id,tier,status,current_period_end,amount,currency").eq("user_id", user.id).in("status", ["active", "past_due"]),
      ]);
      profile = (p as Profile) ?? null;
      const now = Date.now();
      // Premium only while a subscription is active and inside its paid period. "past_due" = on hold (no access).
      const active = (subs ?? []).filter(s => s.status === "active" && (!s.current_period_end || new Date(s.current_period_end).getTime() > now));
      tier = active.some(s => s.tier === "premium_plus") ? "premium_plus" : active.length ? "premium" : "free";
      onHold = (subs ?? []).find(s => s.status === "past_due") ?? null;
    }
  }
  const geo = await currentCountry(profile?.country);
  const country: Country | null = geo.code ? COUNTRIES[geo.code] : null;
  const displayName = user ? profile?.full_name || user.email?.split("@")[0] || "My account" : null;
  return { user, profile, country, displayCountry: country ?? COUNTRIES[DEFAULT_COUNTRY], geo, tier, isPremium: tier !== "free", displayName, onHold };
});

export async function isAdmin() {
  const { user } = await getSession();
  const admins = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  return Boolean(user?.email && admins.includes(user.email.toLowerCase()));
}

export { adminClient };
