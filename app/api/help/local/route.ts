import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getArea } from "@/lib/area";
import { HELP_CATEGORIES, LOCAL_SEARCH } from "@/lib/help";
import { searchPlaces, placesEnabled } from "@/lib/places";
import type { HelpCategory } from "@/lib/types";

/** GET /api/help/local?category=budget_adviser → nearby services (needs GOOGLE_PLACES_API_KEY). */
export async function GET(req: Request) {
  const category = new URL(req.url).searchParams.get("category") as HelpCategory;
  if (!(category in HELP_CATEGORIES)) return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  const { profile, country, displayCountry } = await getSession();
  const c = country ?? displayCountry;
  const area = await getArea(profile);
  if (!placesEnabled()) return NextResponse.json({ places: [], enabled: false });
  const places = await searchPlaces({ query: LOCAL_SEARCH[c.code][category], city: area.city, countryName: c.name, regionCode: c.code === "GB" ? "GB" : c.code, lat: area.lat, lng: area.lng });
  return NextResponse.json({ places, enabled: true, area: area.city });
}
