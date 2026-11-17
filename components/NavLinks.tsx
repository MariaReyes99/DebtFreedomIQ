"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Desktop menu, named by what people want to do (not by product features). */
export default function NavLinks({ loggedIn }: { loggedIn: boolean }) {
  const path = usePathname();
  const items = [
    ...(loggedIn ? [{ href: "/dashboard", label: "Home" }] : []),
    { href: "/health", label: "Check my finances", badge: "Free" },
    { href: "/help", label: "Get help" },
    { href: "/plan", label: "My plan" },
    { href: "/whatif", label: "Explore my future" },
    { href: "/pricing", label: "Pricing" },
  ];
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
      {items.map(i => {
        const active = path === i.href || path.startsWith(i.href + "/");
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-[15px] font-semibold transition ${active ? "bg-teal-50 text-teal-700" : "text-navy-700 hover:bg-navy-50 hover:text-navy-900"}`}>
            {i.label}{"badge" in i && i.badge && <span className="ml-1.5 rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-700">{i.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

const I = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  check: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
  plan: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  explore: <><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="5" /></>,
  help: <><path d="M7 11l3-3 3 2 4-4" /><path d="M3 13l5 5h5l8-8" /></>,
};

/** Bottom menu bar on phones and small tablets: faster than a hamburger menu. */
export function BottomNav({ loggedIn }: { loggedIn: boolean }) {
  const path = usePathname();
  const items = [
    { href: loggedIn ? "/dashboard" : "/", label: "Home", icon: I.home },
    { href: "/health", label: "Check", icon: I.check },
    { href: "/plan", label: "Plan", icon: I.plan },
    { href: "/whatif", label: "Explore", icon: I.explore },
    { href: "/help", label: "Help", icon: I.help },
  ];
  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-navy-100 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(i => {
          const active = i.href === "/" ? path === "/" : path === i.href || path.startsWith(i.href + "/");
          return (
            <li key={i.label}>
              <Link href={i.href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-teal-700" : "text-navy-500"}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{i.icon}</svg>
                {i.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
