import "server-only";

/** Optional Google Places (New) Text Search. Set GOOGLE_PLACES_API_KEY to enable inline local listings. */
export type Place = { name: string; address: string | null; phone: string | null; website: string | null; mapsUrl: string | null; open: boolean | null };
export const placesEnabled = () => Boolean(process.env.GOOGLE_PLACES_API_KEY);

const cache = new Map<string, { at: number; data: Place[] }>();
const DAY = 864e5;

export async function searchPlaces(o: { query: string; city: string | null; countryName: string; regionCode: string; lat: number | null; lng: number | null }): Promise<Place[]> {
  if (!placesEnabled()) return [];
  const textQuery = o.city ? `${o.query} in ${o.city}, ${o.countryName}` : `${o.query} ${o.countryName}`;
  const key = `${textQuery}|${o.lat?.toFixed(2)}|${o.lng?.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY) return hit.data;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.businessStatus,places.currentOpeningHours.openNow",
      },
      body: JSON.stringify({
        textQuery, maxResultCount: 5, languageCode: "en", regionCode: o.regionCode,
        ...(o.lat != null && o.lng != null ? { locationBias: { circle: { center: { latitude: o.lat, longitude: o.lng }, radius: 30000 } } } : {}),
      }),
    });
    if (!res.ok) { console.error("[places]", res.status, await res.text()); return []; }
    const json = await res.json() as { places?: { displayName?: { text?: string }; formattedAddress?: string; nationalPhoneNumber?: string; websiteUri?: string; googleMapsUri?: string; businessStatus?: string; currentOpeningHours?: { openNow?: boolean } }[] };
    const data: Place[] = (json.places ?? [])
      .filter(p => p.businessStatus !== "CLOSED_PERMANENTLY")
      .map(p => ({ name: p.displayName?.text ?? "Unknown", address: p.formattedAddress ?? null, phone: p.nationalPhoneNumber ?? null, website: p.websiteUri ?? null, mapsUrl: p.googleMapsUri ?? null, open: p.currentOpeningHours?.openNow ?? null }));
    cache.set(key, { at: Date.now(), data });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return data;
  } catch (e) {
    console.error("[places]", (e as Error).message);
    return [];
  }
}
