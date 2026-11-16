"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

/** Where each step can take the person next (by keywords in the step text). */
function actionFor(step: string): { href: string; label: string } | null {
  const s = step.toLowerCase();
  if (/mentor|counsel|adviser|advisor|find help|legal|lawyer|collector|court|hardship/.test(s)) return { href: "/help", label: "Find help" };
  if (/food|housing|power|rent|essentials/.test(s)) return { href: "/help#free", label: "Free support" };
  if (/list every debt|balance and interest|statement/.test(s)) return { href: "/health", label: "Update my debts" };
  if (/emergency|savings|automat|payday|plan|pay off|target/.test(s)) return { href: "/plan", label: "See my plan" };
  return null;
}

export default function NextSteps({ steps, assessmentId, initialDone = [], loggedIn }: { steps: string[]; assessmentId?: string | null; initialDone?: number[]; loggedIn: boolean }) {
  const storeKey = `dfiq_steps_${assessmentId ?? "latest"}`;
  const [done, setDone] = useState<number[]>(initialDone);
  const [saved, setSaved] = useState<"" | "saved" | "local">("");

  // Not logged in (or nothing saved yet): restore ticks from this browser
  useEffect(() => {
    if (initialDone.length) return;
    try { const raw = localStorage.getItem(storeKey); if (raw) setDone(JSON.parse(raw)); } catch { /* ignore */ }
  }, [storeKey, initialDone.length]);

  const toggle = async (i: number) => {
    const next = done.includes(i) ? done.filter(x => x !== i) : [...done, i].sort();
    setDone(next);
    try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* ignore */ }
    if (loggedIn && assessmentId) {
      const r = await fetch("/api/assessment/steps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId, done: next }) });
      setSaved(r.ok ? "saved" : "local");
    } else setSaved("local");
  };

  const pct = steps.length ? Math.round((done.length / steps.length) * 100) : 0;
  const all = steps.length > 0 && done.length === steps.length;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Your next steps this week</h2>
        <span className="text-sm font-semibold text-teal-700">{done.length} of {steps.length} done</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Next steps progress">
        <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-3 space-y-2">
        {steps.map((s, i) => {
          const checked = done.includes(i);
          const act = actionFor(s);
          return (
            <li key={i} className="flex items-start gap-3 rounded-xl bg-white/70 p-2.5">
              <input id={`step-${i}`} type="checkbox" checked={checked} onChange={() => toggle(i)} className="mt-0.5 cursor-pointer" />
              <div className="flex-1">
                <label htmlFor={`step-${i}`} className={`cursor-pointer font-medium ${checked ? "text-navy-400 line-through" : "text-navy-800"}`}>{s}</label>
                {act && !checked && <Link href={act.href} className="ml-2 whitespace-nowrap text-sm font-semibold text-teal-700 hover:underline">{act.label} →</Link>}
              </div>
            </li>
          );
        })}
      </ul>
      {all && <p className="mt-3 rounded-xl bg-teal-500 p-3 text-sm font-semibold text-white" role="status">🎉 Well done, that&apos;s every step this week! Come back next month and redo your Financial Health check to see your score improve.</p>}
      {saved && !all && <p className="mt-2 text-xs text-navy-500" role="status">{saved === "saved" ? "✓ Saved to your account" : loggedIn ? "Saved on this device" : "Saved on this device. Create a free account to keep your progress."}</p>}
    </div>
  );
}
