"use client";
import { useState } from "react";

type Contact = { name: string; phone?: string; email?: string; url?: string; note?: string };
type Place = { name: string; address: string | null; phone: string | null; website: string | null; mapsUrl: string | null; open: boolean | null };

/** "Near you" block inside a help-category card. */
export default function LocalHelp({ category, label, area, mapsUrl, placesOn, contact }: { category: string; label: string; area: string | null; mapsUrl: string; placesOn: boolean; contact?: Contact | null }) {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/help/local?category=${category}`);
    const j = await r.json().catch(() => ({ places: [] }));
    setPlaces(j.places ?? []); setLoading(false);
  };
  const btn = "inline-flex items-center gap-1 rounded-full border border-navy-200 px-2.5 py-1 text-xs font-semibold text-navy-700 hover:border-teal-400 hover:text-teal-700";
  return (
    <div className="mt-4 border-t border-navy-100 pt-3">
      {contact && (
        <div className="mb-3 rounded-xl bg-teal-50/70 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{contact.note ?? "Free national service"}</p>
          <p className="mt-0.5 text-sm font-semibold text-navy-900">{contact.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {contact.phone && <a className={btn} href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`}>📞 {contact.phone}</a>}
            {contact.email && <a className={btn} href={`mailto:${contact.email}`}>✉️ Email</a>}
            {contact.url && <a className={btn} href={contact.url} target="_blank" rel="noopener noreferrer">🌐 Website</a>}
          </div>
        </div>
      )}
      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">📍 Near {area ?? "you"}</p>
      {placesOn && places === null && (
        <button onClick={load} disabled={loading} className="mt-2 text-sm font-semibold text-teal-700 hover:underline">{loading ? "Finding local services…" : `Show ${label} near ${area ?? "me"}`}</button>
      )}
      {places && places.length > 0 && (
        <ul className="mt-2 space-y-3">
          {places.map(p => (
            <li key={p.name + p.address} className="text-sm">
              <p className="font-semibold text-navy-900">{p.name}{p.open !== null && <span className={`ml-2 text-xs font-medium ${p.open ? "text-emerald-600" : "text-navy-400"}`}>{p.open ? "Open now" : "Closed now"}</span>}</p>
              {p.address && <p className="text-xs text-navy-500">{p.address}</p>}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {p.phone && <a className={btn} href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>📞 {p.phone}</a>}
                {p.website && <a className={btn} href={p.website} target="_blank" rel="noopener noreferrer">🌐 Website</a>}
                {p.mapsUrl && <a className={btn} href={p.mapsUrl} target="_blank" rel="noopener noreferrer">🧭 Directions</a>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {places && places.length === 0 && <p className="mt-2 text-sm text-navy-500">No listings found nearby. Try the map search below.</p>}
      <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">🗺️ Find {label} near {area ?? "me"} on Google Maps ↗</a>
      {places && places.length > 0 && <p className="mt-1 text-[11px] text-navy-400">Listings from Google. Not endorsements. Check services are free or licensed before you go.</p>}
    </div>
  );
}
