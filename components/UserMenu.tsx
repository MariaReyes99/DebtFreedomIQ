"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const Icon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function UserMenu({ name, premium }: { name: string | null; premium: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, []);
  const btn = "inline-flex items-center gap-2 rounded-full border border-navy-200 bg-white px-3 py-1.5 text-sm font-semibold text-navy-800 hover:border-teal-400 hover:text-teal-700";
  if (name) return (
    <Link href="/account" className={btn} title="Edit my profile">
      <Icon /><span className="max-w-[9rem] truncate">{name}</span>{premium && <span className="rounded-full bg-teal-500 px-1.5 text-[10px] font-bold uppercase text-white">Pro</span>}
    </Link>
  );
  return (
    <div className="relative" ref={ref}>
      <button type="button" className={btn} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <Icon /><span>Log in</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-52 rounded-2xl border border-navy-100 bg-white p-1.5 shadow-xl shadow-navy-900/10">
          <Link role="menuitem" href="/login" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-navy-800 hover:bg-navy-50">Log in</Link>
          <Link role="menuitem" href="/signup" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50">Create free account</Link>
        </div>
      )}
    </div>
  );
}
