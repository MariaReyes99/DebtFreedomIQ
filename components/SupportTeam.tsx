"use client";
import { useEffect, useState } from "react";
import { HELP_CATEGORIES } from "@/lib/help";
import type { Readiness, TeamMember } from "@/lib/supportteam";
import { Badge, Button, Card, cx } from "./ui";
import { COUNTRIES, money, type CountryCode } from "@/lib/countries";

type Contact = { name: string; phone?: string; email?: string; url?: string; note?: string } | null;
const KEY = "dfiq_referral_ready";
const PRI: Record<TeamMember["priority"], { tone: "red" | "amber" | "teal" | "gray"; dot: string }> = { Urgent: { tone: "red", dot: "🔴" }, High: { tone: "amber", dot: "🟠" }, Medium: { tone: "teal", dot: "🟡" }, Later: { tone: "gray", dot: "⚪" } };
const dateText = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

export default function SupportTeam({ team, contacts, readiness, brief, countryCode, name }: {
  team: TeamMember[]; contacts: Record<string, Contact>; readiness: Readiness; brief: string; countryCode: CountryCode; name: string;
}) {
  const fmt = (n: number) => money(COUNTRIES[countryCode], n);
  const [ticked, setTicked] = useState<string[]>([]);
  useEffect(() => { try { setTicked(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { /* private mode */ } }, []);
  const toggle = (id: string) => setTicked(t => { const n = t.includes(id) ? t.filter(x => x !== id) : [...t, id]; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const items = readiness.items.map(x => ({ ...x, done: x.auto ? x.done : ticked.includes(x.id) }));
  const score = Math.round((items.filter(x => x.done).length / items.length) * 100);

  const downloadPackage = () => {
    const lines = [
      `REFERRAL PACKAGE — ${name || "Client"}`, `Prepared with DebtFreedomIQ on ${new Date().toLocaleDateString()}`, "",
      "WHO I'M CONTACTING (in order)",
      ...team.map((t, k) => { const c = contacts[t.category]; return `${k + 1}. ${HELP_CATEGORIES[t.category].label} [${t.priority}, by ${dateText(t.contactBy)}]${c ? ` — ${c.name}${c.phone ? `, ${c.phone}` : ""}${c.url ? `, ${c.url}` : ""}` : ""}\n   Why: ${t.why.join("; ")}\n   What I'd like help with: ${t.outcomes.join("; ")}`; }),
      "", "CHECKLIST", ...items.map(x => `[${x.done ? "x" : " "}] ${x.label}`), "", brief,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "referral-package.txt"; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-navy-900 to-navy-800 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Badge tone="teal">Your financial support team</Badge>
            <p className="mt-2 text-2xl font-bold">{team.length} {team.length === 1 ? "expert" : "experts"} matched to your numbers</p>
            <p className="mt-1 text-navy-100">In priority order. Start at the top; most of these services are free.</p>
          </div>
          <div className="text-center"><p className="text-4xl font-bold">{score}%</p><p className="text-xs text-navy-200">referral ready</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><Button onClick={downloadPackage} variant="secondary" size="sm">⬇ Generate referral package</Button><Button href="#ready" variant="secondary" size="sm">Get ready ↓</Button></div>
      </Card>

      <ol className="grid gap-4 lg:grid-cols-2">
        {team.map((t, k) => {
          const h = HELP_CATEGORIES[t.category], c = contacts[t.category], p = PRI[t.priority];
          return (
            <li key={t.category}>
              <Card className={cx("h-full", k === 0 && "border-2 border-teal-400")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-lg font-bold"><span aria-hidden>{h.icon}</span> {k + 1}. {h.label}</p>
                  <Badge tone={p.tone}>{p.dot} {t.priority}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-navy-500">Contact by <strong>{dateText(t.contactBy)}</strong> · {h.cost}</p>
                <p className="mt-3 text-sm font-semibold">Why we matched you</p>
                <ul className="mt-1 space-y-0.5 text-sm">{t.why.map(w => <li key={w}>✓ {w}</li>)}</ul>
                <p className="mt-3 text-sm font-semibold">What you can expect</p>
                <ul className="mt-1 space-y-0.5 text-sm text-navy-700">{t.outcomes.map(o => <li key={o}>• {o}</li>)}</ul>
                {(t.impactMonthly > 0 || t.impactOneOff > 0) && (
                  <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm">
                    <p className="font-semibold text-emerald-800">Options they can help with: {t.impactMonthly > 0 ? `up to ${fmt(t.impactMonthly)}/month` : ""}{t.impactMonthly > 0 && t.impactOneOff > 0 ? " + " : ""}{t.impactOneOff > 0 ? `${fmt(t.impactOneOff)} one-off` : ""}</p>
                    <p className="mt-0.5 text-xs text-emerald-900">From our estimates: {t.impactFrom.slice(0, 3).join(" · ")}{t.impactFrom.length > 3 ? " …" : ""}</p>
                  </div>
                )}
                {c && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-3">
                    <span className="mr-auto text-sm font-semibold">{c.name}{c.note && <span className="block text-xs font-normal text-navy-500">{c.note}</span>}</span>
                    {c.phone && <Button size="sm" href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}>📞 Call {c.phone}</Button>}
                    {c.email && <Button size="sm" variant="secondary" href={`mailto:${c.email}?subject=${encodeURIComponent("Appointment request")}`}>✉️ Email</Button>}
                    {c.url && <Button size="sm" variant="secondary" href={c.url} target="_blank" rel="noopener">Website ↗</Button>}
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>

      <Card as="section" id="ready" className="scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h3 className="text-lg font-bold">Referral readiness</h3><p className="text-sm text-navy-600">Having these ready makes your first appointment faster and more useful.</p></div>
          <div className="flex items-center gap-3"><div className="h-3 w-40 overflow-hidden rounded-full bg-navy-100" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="Referral readiness"><div className={cx("h-full rounded-full", score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${score}%` }} /></div><strong className="text-xl">{score}%</strong></div>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {items.map(x => (
            <li key={x.id} className={cx("flex items-center gap-3 rounded-xl border p-3 text-sm", x.done ? "border-emerald-200 bg-emerald-50/60" : "border-navy-100")}>
              {x.auto ? <span aria-hidden className={cx("text-lg", x.done ? "text-emerald-600" : "text-navy-300")}>{x.done ? "✅" : "⬜"}</span>
                : <input type="checkbox" checked={x.done} onChange={() => toggle(x.id)} className="h-5 w-5 accent-teal-600" aria-label={x.label} />}
              <span className="flex-1">{x.label}{x.auto && !x.done && x.href && <a href={x.href} className="ml-2 font-semibold text-teal-700">Fix →</a>}</span>
              {!x.auto && <span className="text-[11px] text-navy-400">tick when ready</span>}
            </li>
          ))}
        </ul>
        <div className="mt-4"><Button onClick={downloadPackage}>⬇ Generate referral package</Button><span className="ml-3 text-xs text-navy-500">Your matches, contacts, checklist and brief in one file to bring or send.</span></div>
      </Card>
    </div>
  );
}
