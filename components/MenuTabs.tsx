"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MenuTabs({ helpHref }: { helpHref: string }) {
  const path = usePathname();
  const items = [
    { n: 1, href: "/", label: "Health Check", active: path === "/" },
    { n: 2, href: helpHref, label: "Find Help", active: path.startsWith("/help") },
    { n: 3, href: "/plan", label: "My Plan", active: path.startsWith("/plan") },
  ];
  return (
    <nav className="menu" aria-label="Main menu">
      <div className="wrap">
        {items.map(i => (
          <Link key={i.n} href={i.href} className={i.active ? "active" : ""} aria-current={i.active ? "page" : undefined}>
            <b>{i.n}</b>{i.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
