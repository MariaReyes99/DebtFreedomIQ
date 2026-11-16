"use client";
import { useRef } from "react";
import { setCountry } from "@/app/actions";
import { COUNTRY_LIST } from "@/lib/countries";

export default function CountryPicker({ value, label = "I live in", id = "country-pick" }: { value?: string | null; label?: string; id?: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={setCountry} ref={ref} className="country-pick">
      <label htmlFor={id}>{label}</label>
      <select id={id} name="country" defaultValue={value ?? ""} onChange={() => ref.current?.requestSubmit()}>
        {!value && <option value="" disabled>Select your country…</option>}
        {COUNTRY_LIST.map(c => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
      </select>
    </form>
  );
}
