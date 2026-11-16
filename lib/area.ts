import "server-only";
import { cookies } from "next/headers";
import { detectedPlace } from "./geo";
import type { Profile } from "./session";

export type Area = { city: string | null; region: string | null; lat: number | null; lng: number | null; source: "profile" | "chosen" | "login" | "ip" | "none" };

/** The person's local area: their own town (profile/cookie) → town at login → current IP town. */
export async function getArea(profile: Profile | null): Promise<Area> {
  if (profile?.city) {
    const hasCoords = profile.latitude != null && profile.longitude != null;
    return { city: profile.city, region: profile.region ?? null, lat: hasCoords ? Number(profile.latitude) : null, lng: hasCoords ? Number(profile.longitude) : null, source: hasCoords ? "login" : "profile" };
  }
  const chosen = (await cookies()).get("area")?.value;
  if (chosen) return { city: decodeURIComponent(chosen), region: null, lat: null, lng: null, source: "chosen" };
  const p = await detectedPlace();
  if (p.city) return { ...p, source: "ip" };
  return { city: null, region: null, lat: null, lng: null, source: "none" };
}
