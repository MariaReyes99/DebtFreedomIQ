"use client";
import { useState } from "react";
import { setArea } from "@/app/help/actions";

export default function AreaForm({ city, source }: { city: string | null; source: string }) {
  const [editing, setEditing] = useState(!city);
  if (!editing) return (
    <p className="text-sm text-navy-700">📍 Showing local help near <strong>{city}</strong>{source === "ip" || source === "login" ? <span className="text-navy-500"> (from your location)</span> : null} · <button onClick={() => setEditing(true)} className="font-semibold text-teal-700 hover:underline">Change town</button></p>
  );
  return (
    <form action={async fd => { await setArea(fd); setEditing(false); }} className="flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] flex-1 sm:flex-none">
        <label htmlFor="city" className="text-sm">Your town or city <span className="font-normal text-navy-500">(to find help near you)</span></label>
        <input id="city" name="city" defaultValue={city ?? ""} placeholder="e.g. Lower Hutt" autoComplete="address-level2" className="mt-1" />
      </div>
      <button className="rounded-full bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600">Save</button>
      {city && <button type="button" onClick={() => setEditing(false)} className="px-2 py-2.5 text-sm text-navy-500">Cancel</button>}
    </form>
  );
}
