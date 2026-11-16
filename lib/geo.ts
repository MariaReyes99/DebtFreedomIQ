import { headers, cookies } from "next/headers";
import { toCountryCode, type CountryCode } from "./countries";

/** Raw ISO country from the hosting edge (Vercel sets x-vercel-ip-country). */
export async function detectedCountryRaw(): Promise<string | null> {
  const h = await headers();
  return h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || h.get("x-country") || null;
}

/** Best country for this visitor: explicit choice cookie → profile (caller) → IP. */
export async function currentCountry(profileCountry?: string | null): Promise<{ code: CountryCode | null; detected: string | null; source: "choice" | "profile" | "ip" | "none" }> {
  const c = await cookies();
  const choice = toCountryCode(c.get("country")?.value);
  const detected = await detectedCountryRaw();
  if (choice) return { code: choice, detected, source: "choice" };
  const prof = toCountryCode(profileCountry);
  if (prof) return { code: prof, detected, source: "profile" };
  const ip = toCountryCode(detected);
  if (ip) return { code: ip, detected, source: "ip" };
  return { code: null, detected, source: "none" };
}
