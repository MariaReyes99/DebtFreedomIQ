import Link from "next/link";
import type { ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type BtnProps = { children: ReactNode; href?: string; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "dark"; size?: "sm" | "md" | "lg"; className?: string; type?: "button" | "submit"; disabled?: boolean; full?: boolean };
export function Button({ children, href, onClick, variant = "primary", size = "md", className, type = "button", disabled, full }: BtnProps) {
  const cls = cx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition focus-visible:outline-3 disabled:opacity-50 disabled:cursor-not-allowed",
    size === "sm" && "px-3.5 py-1.5 text-sm", size === "md" && "px-5 py-2.5 text-[15px]", size === "lg" && "px-7 py-3.5 text-base",
    variant === "primary" && "bg-teal-500 text-white hover:bg-teal-600 shadow-sm shadow-teal-900/10",
    variant === "secondary" && "border border-navy-200 bg-white text-navy-800 hover:border-navy-300 hover:bg-navy-50",
    variant === "ghost" && "text-teal-700 hover:bg-teal-50",
    variant === "dark" && "bg-navy-900 text-white hover:bg-navy-800",
    full && "w-full", className);
  return href ? <Link href={href} className={cls}>{children}</Link> : <button type={type} className={cls} disabled={disabled} onClick={onClick}>{children}</button>;
}

export function Card({ children, className, as: As = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  const customBg = /(^|\s)(bg-(?!opacity)|from-)/.test(className ?? "");
  return <As className={cx("rounded-2xl border border-navy-100 p-5 shadow-sm shadow-navy-900/[0.03] sm:p-6", !customBg && "bg-white", className)}>{children}</As>;
}

export function Badge({ children, tone = "teal", className }: { children: ReactNode; tone?: "teal" | "navy" | "amber" | "red" | "green" | "gray"; className?: string }) {
  const t = { teal: "bg-teal-50 text-teal-700 ring-teal-200", navy: "bg-navy-900 text-white ring-navy-900", amber: "bg-amber-50 text-amber-800 ring-amber-200", red: "bg-red-50 text-red-700 ring-red-200", green: "bg-emerald-50 text-emerald-700 ring-emerald-200", gray: "bg-navy-50 text-navy-600 ring-navy-200" }[tone];
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", t, className)}>{children}</span>;
}

export function StatCard({ label, value, sub, tone = "navy", icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "navy" | "good" | "warn" | "bad"; icon?: string }) {
  const color = { navy: "text-navy-900", good: "text-emerald-600", warn: "text-amber-600", bad: "text-red-600" }[tone];
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between text-sm font-medium text-navy-500"><span>{label}</span>{icon && <span aria-hidden>{icon}</span>}</div>
      <div className={cx("mt-1.5 whitespace-nowrap text-xl font-bold tracking-tight sm:text-2xl xl:text-[26px]", color)}>{value}</div>
      {sub && <div className="mt-1 text-xs text-navy-500">{sub}</div>}
    </Card>
  );
}

/** Circular 0–100 gauge. `invert` = higher is worse (stress). */
export function ScoreRing({ value, label, sub, invert = false, size = 140 }: { value: number; label: string; sub?: string; invert?: boolean; size?: number }) {
  const good = invert ? 100 - value : value;
  const color = good >= 65 ? "#10b981" : good >= 45 ? "#f59e0b" : "#ef4444";
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="flex flex-col items-center text-center" role="img" aria-label={`${label}: ${value} out of 100${sub ? `, ${sub}` : ""}`}>
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e3e9f3" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 60 60)" />
        <text x="60" y="58" textAnchor="middle" className="fill-navy-900" style={{ fontSize: 30, fontWeight: 800 }}>{value}</text>
        <text x="60" y="78" textAnchor="middle" className="fill-navy-500" style={{ fontSize: 11 }}>/ 100</text>
      </svg>
      <div className="mt-1 font-semibold text-navy-900">{label}</div>
      {sub && <div className="text-sm" style={{ color }}>{sub}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{title}</h1>
        {children && <div className="mt-2 max-w-2xl text-navy-600">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PremiumGate({ title, children, price }: { title: string; children: ReactNode; price: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-navy-100 bg-white">
      <div className="pointer-events-none select-none p-6 opacity-40 blur-[3px]" aria-hidden>{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/85 to-white/40 p-6">
        <div className="max-w-md text-center">
          <Badge tone="navy">🔒 Premium</Badge>
          <h3 className="mt-3 text-xl font-bold text-navy-900">{title}</h3>
          <p className="mt-2 text-navy-600">Unlock with a one-time Premium report for <strong>{price}</strong>. No subscription.</p>
          <div className="mt-4 flex justify-center gap-2"><Button href="/checkout?tier=premium">Unlock Premium</Button><Button href="/pricing" variant="secondary">See what&apos;s included</Button></div>
        </div>
      </div>
    </div>
  );
}

export function Disclaimer({ className }: { className?: string }) {
  return <p className={cx("text-xs leading-relaxed text-navy-500", className)}>DebtFreedomIQ provides general information and educational tools, not personalised financial, legal or tax advice. AI-generated content can be wrong. Check important decisions with a licensed professional or a free financial mentor/counsellor.</p>;
}

export { cx };
