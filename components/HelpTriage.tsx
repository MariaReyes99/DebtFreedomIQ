"use client";
import { useState } from "react";
import type { Resource } from "@/lib/countries";
import { Badge, Card, cx } from "./ui";

export type Need = { key: string; icon: string; label: string; items: (Resource & { tag?: "first" | "urgent" })[]; nearYou?: { label: string; url: string }; extra?: { label: string; href: string } };

const tel = (p: string) => `tel:${p.replace(/[^\d+]/g, "")}`;

/** "What do you need help with?" One tap shows the two or three best places to start, with the most important first. */
export default function HelpTriage({ needs, area }: { needs: Need[]; area: string | null }) {
  const [pick, setPick] = useState<string | null>(null);
  const need = needs.find(n => n.key === pick);
  return (
    <Card as="section" className="border-2 border-teal-300 bg-teal-50/50">
      <h2 className="text-xl font-bold">Start here: what do you need help with?</h2>
      <p className="mt-1 text-sm text-navy-600">Tap one. We&apos;ll show you exactly who to contact first{area ? ` near ${area}` : ""}.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label="What you need help with">
        {needs.map(n => (
          <button key={n.key} type="button" role="radio" aria-checked={pick === n.key} onClick={() => setPick(n.key)}
            className={cx("flex items-center gap-2 rounded-xl border-2 px-3 py-3 text-left text-sm font-semibold", pick === n.key ? "border-teal-500 bg-white" : "border-transparent bg-white/70 hover:border-teal-300")}>
            <span className="text-2xl" aria-hidden>{n.icon}</span>{n.label}
          </button>
        ))}
      </div>
      {need && (
        <div className="mt-5 space-y-3" aria-live="polite">
          {need.items.map((r, k) => (
            <div key={r.name} className={cx("rounded-xl border bg-white p-4", k === 0 ? "border-teal-400" : "border-navy-100")}>
              <div className="flex flex-wrap items-center gap-2">
                {r.tag === "urgent" ? <Badge tone="red">🔴 Immediate support</Badge> : k === 0 ? <Badge tone="green">🟢 Best first step</Badge> : <Badge tone="gray">Also helps</Badge>}
                <h3 className="text-lg font-bold">{r.name}</h3>
              </div>
              <p className="mt-1 text-sm text-navy-700">{r.what}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.phone && <a href={tel(r.phone)} className="rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">📞 Call {r.phone}</a>}
                {r.text && <a href={`sms:${r.text.replace(/[^\d+]/g, "")}`} className="rounded-full border border-teal-400 px-4 py-2 text-sm font-semibold text-teal-700">💬 Text {r.text}</a>}
                {r.email && <a href={`mailto:${r.email}`} className="rounded-full border border-navy-200 px-4 py-2 text-sm font-semibold">✉️ Email</a>}
                {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-navy-200 px-4 py-2 text-sm font-semibold">🌐 Website ↗</a>}
              </div>
              {r.hours && <p className="mt-1 text-xs text-navy-500">{r.hours}</p>}
            </div>
          ))}
          <div className="flex flex-wrap gap-3 text-sm">
            {need.nearYou && <a href={need.nearYou.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-700 hover:underline">📍 {need.nearYou.label} ↗</a>}
            {need.extra && <a href={need.extra.href} className="font-semibold text-teal-700 hover:underline">{need.extra.label} →</a>}
          </div>
        </div>
      )}
    </Card>
  );
}
