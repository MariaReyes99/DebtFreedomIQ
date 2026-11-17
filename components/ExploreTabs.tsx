"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sub-pages of Explore my future. */
const TABS = [
  { href: "/whatif", label: "What-if simulator", icon: "🔀" },
  { href: "/whatif/retirement", label: "My retirement picture", icon: "📊" },
  { href: "/whatif/library", label: "Ask the library", icon: "💬" },
  { href: "/whatif/library/how-it-works", label: "How it works", icon: "⚙️" },
  { href: "/whatif/library/sources", label: "Sources", icon: "📚" },
];

export default function ExploreTabs() {
  const path = usePathname();
  const active = (h: string) => (h === "/whatif" || h === "/whatif/library" ? path === h : path === h || path.startsWith(h + "/"));
  return (
    <nav aria-label="Explore my future" className="no-print -mx-4 mb-6 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-2 border-b border-navy-100 pb-3">
        {TABS.map(t => (
          <li key={t.href}>
            <Link href={t.href} aria-current={active(t.href) ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${active(t.href) ? "bg-navy-900 text-white" : "border border-navy-200 bg-white text-navy-700 hover:border-teal-400 hover:text-teal-700"}`}>
              <span aria-hidden>{t.icon}</span>{t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
