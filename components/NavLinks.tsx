"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function NavLinks({ loggedIn }: { loggedIn: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = [
    ...(loggedIn ? [{ href: "/dashboard", label: "Home" }] : []),
    { href: "/health", label: "Financial Health", badge: "Free" },
    { href: "/help", label: "Find Help" },
    { href: "/plan", label: "My Freedom Plan" },
    { href: "/whatif", label: "Simulator" },
    { href: "/pricing", label: "Pricing" },
  ];
  const link = (i: (typeof items)[number], mobile = false) => {
    const active = path === i.href || path.startsWith(i.href + "/");
    return (
      <Link key={i.href} href={i.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
        className={`${mobile ? "block px-4 py-3" : "px-3 py-2"} rounded-lg text-[15px] font-semibold transition ${active ? "text-teal-700 bg-teal-50" : "text-navy-700 hover:text-navy-900 hover:bg-navy-50"}`}>
        {i.label}{"badge" in i && i.badge && <span className="ml-1.5 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-700">{i.badge}</span>}
      </Link>
    );
  };
  return (
    <>
      <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">{items.map(i => link(i))}</nav>
      <button className="rounded-lg p-2 text-navy-700 hover:bg-navy-50 lg:hidden" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
      {open && <nav aria-label="Mobile" className="absolute inset-x-0 top-full z-30 border-b border-navy-100 bg-white p-2 shadow-lg lg:hidden">{items.map(i => link(i, true))}</nav>}
    </>
  );
}
