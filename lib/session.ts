import { cache } from "react";
import { createClient, adminClient, isConfigured } from "./supabase/server";
import { currentCountry } from "./geo";
import { COUNTRIES, DEFAULT_COUNTRY, type Country } from "./countries";

export type Tier = "free" | "premium" | "premium_plus";
export type Profile = { id: string; email: string | null; full_name: string | null; country: string | null };

export const getSession = cache(async () => {
  let user: { id: string; email?: string } | null = null;
  let profile: Profile | null = null;
  let tier: Tier = "free";
  if (isConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user ? { id: data.user.id, email: data.user.email } : null;
    if (user) {
      const [{ data: p }, { data: subs }] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name,country").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("tier,status,current_period_end").eq("user_id", user.id).eq("status", "active"),
      ]);
      profile = (p as Profile) ?? null;
      const now = Date.now();
      const active = (subs ?? []).filter(s => !s.current_period_end || new Date(s.current_period_end).getTime() > now);
      tier = active.some(s => s.tier === "premium_plus") ? "premium_plus" : active.length ? "premium" : "free";
    }
  }
  const geo = await currentCountry(profile?.country);
  const country: Country | null = geo.code ? COUNTRIES[geo.code] : null;
  const displayName = user ? profile?.full_name || user.email?.split("@")[0] || "My account" : null;
  return { user, profile, country, displayCountry: country ?? COUNTRIES[DEFAULT_COUNTRY], geo, tier, isPremium: tier !== "free", displayName };
});

export async function isAdmin() {
  const { user } = await getSession();
  const admins = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  return Boolean(user?.email && admins.includes(user.email.toLowerCase()));
}

export { adminClient };
