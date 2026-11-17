import Link from "next/link";

const LINKS = [
  ["/admin", "📊 Insights"],
  ["/admin/subscribers", "💳 Subscribers & payments"],
  ["/admin/customers", "👤 Customers"],
  ["/admin/support", "✉️ Support inbox"],
  ["/admin/testimonials", "⭐ Stories"],
  ["/admin/audit", "🛡️ Audit log"],
] as const;

export default function AdminNav({ current, openCount }: { current: string; openCount?: number }) {
  return (
    <nav aria-label="Admin" className="mb-6 flex flex-wrap gap-2">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={current === href ? "page" : undefined}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${current === href ? "bg-navy-900 text-white" : "border border-navy-200 bg-white text-navy-700 hover:border-teal-400"}`}>
          {label}{href === "/admin/support" && openCount ? <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-xs text-white">{openCount}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
