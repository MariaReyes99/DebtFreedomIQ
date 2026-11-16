"use client";
import { useId, useMemo, useRef, useState } from "react";
import { COUNTRY_LIST, COUNTRIES, type CountryCode } from "@/lib/countries";

// Extra words people might type for each country
const ALIASES: Record<CountryCode, string[]> = {
  NZ: ["aotearoa", "kiwi"],
  PH: ["pilipinas", "pinas", "filipino"],
  US: ["usa", "america", "united states of america"],
  AU: ["oz", "aussie"],
  GB: ["uk", "britain", "great britain", "england", "scotland", "wales", "northern ireland"],
};

/**
 * Type-to-filter country box (substring match). Renders a hidden <input name={name}> for forms
 * and calls onSelect when a country is chosen.
 */
export default function CountrySearch({ name = "country", value, onSelect, label = "Country", required = false, placeholder = "Start typing your country…" }:
  { name?: string; value?: CountryCode | null; onSelect?: (c: CountryCode) => void; label?: string; required?: boolean; placeholder?: string }) {
  const id = useId();
  const [selected, setSelected] = useState<CountryCode | null>(value ?? null);
  const [query, setQuery] = useState(value ? COUNTRIES[value].name : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || (selected && COUNTRIES[selected].name.toLowerCase() === q)) return COUNTRY_LIST;
    return COUNTRY_LIST.filter(c => c.name.toLowerCase().includes(q) || ALIASES[c.code].some(a => a.includes(q)));
  }, [query, selected]);

  const choose = (code: CountryCode) => {
    setSelected(code); setQuery(COUNTRIES[code].name); setOpen(false);
    onSelect?.(code);
  };

  return (
    <div className="relative mb-4">
      <label htmlFor={id}>{label}</label>
      <div className="mt-1.5" />
      <input type="hidden" name={name} value={selected ?? ""} />
      <input
        ref={inputRef} id={id} type="text" autoComplete="off" role="combobox"
        aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? `${id}-${matches[active].code}` : undefined}
        placeholder={placeholder} value={query} required={required && !selected}
        onFocus={e => { setOpen(true); e.currentTarget.select(); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); if (selected) setSelected(null); }}
        onKeyDown={e => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") { if (open && matches[active]) { e.preventDefault(); choose(matches[active].code); } }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-xl border border-navy-200 bg-white p-1 shadow-lg" id={`${id}-list`} role="listbox">
          {matches.length ? matches.map((c, i) => (
            <li key={c.code} id={`${id}-${c.code}`} role="option" aria-selected={i === active}
              className={`cursor-pointer rounded-lg px-3 py-2.5 ${i === active ? "bg-teal-50 font-semibold text-teal-800" : "text-navy-800"}`}
              onMouseDown={e => { e.preventDefault(); choose(c.code); }} onMouseEnter={() => setActive(i)}>
              {c.name}
            </li>
          )) : <li className="px-3 py-2.5 text-sm text-navy-500">No match. We cover New Zealand, the Philippines, the United States, Australia and the United Kingdom.</li>}
        </ul>
      )}
    </div>
  );
}
