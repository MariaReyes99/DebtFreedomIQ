"use client";
import { useState } from "react";
import type { PlanStep } from "@/lib/freedom";
import { Badge, Button, Card, cx } from "./ui";

const dateText = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

/** The next few things to do, as a short to-do list with progress. Small wins keep people going. */
export function TodayList({ steps, done, total, onToggle, showLink }: { steps: PlanStep[]; done: string[]; total: number; onToggle: (id: string) => void; showLink?: boolean }) {
  const [cheer, setCheer] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const next = steps.filter(s => !done.includes(s.id)).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3);
  const doneN = steps.filter(s => done.includes(s.id)).length;
  const pctDone = total ? Math.round((doneN / total) * 100) : 0;
  const tick = (id: string) => {
    const was = done.includes(id);
    onToggle(id);
    if (!was) { setCheer(`Nice work! Progress +${Math.round(100 / Math.max(1, total))}%`); setTimeout(() => setCheer(""), 3500); }
  };
  return (
    <Card as="section" className="border-teal-300 bg-gradient-to-br from-teal-50 to-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">✅ Today&apos;s actions</h2>
        <span className="text-sm font-semibold text-teal-800">{doneN} of {total} done · {pctDone}%</span>
      </div>
      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-teal-100" role="progressbar" aria-valuenow={pctDone} aria-valuemin={0} aria-valuemax={100} aria-label="Plan progress"><div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pctDone}%` }} /></div>
      {cheer && <p role="status" className="mt-2 text-sm font-semibold text-emerald-700">🎉 {cheer}</p>}
      {next.length ? (
        <ul className="mt-3 space-y-2">
          {next.map(s => (
            <li key={s.id}>
              <label className={cx("flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3", s.due < today ? "border-red-200" : "border-navy-100")}>
                <input type="checkbox" checked={false} onChange={() => tick(s.id)} className="mt-1 h-5 w-5 accent-teal-600" />
                <span className="flex-1"><span className="font-semibold">{s.title}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs"><span className={s.due < today ? "font-semibold text-red-700" : "text-navy-500"}>{s.due < today ? "Overdue · was due " : "By "}{dateText(s.due)}</span>{s.monthly ? <span className="font-semibold text-emerald-700">+{s.monthly.toLocaleString()}/month</span> : null}</span>
                </span>
                {s.source === "essential" && <Badge tone="navy">Do first</Badge>}
              </label>
            </li>
          ))}
        </ul>
      ) : <p className="mt-3 text-sm text-navy-700">🎉 All your current steps are done. Update your numbers to see what&apos;s next.</p>}
      {showLink && <Button href="/plan" size="sm" variant="secondary" className="mt-3">See my whole plan →</Button>}
    </Card>
  );
}

/** Stand-alone version (Home page): saves ticks itself. */
export default function TodayActions({ steps, planId, initialDone }: { steps: PlanStep[]; planId: string; initialDone: string[] }) {
  const [done, setDone] = useState(initialDone);
  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter(x => x !== id) : [...done, id];
    setDone(next);
    fetch("/api/plan/steps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, done: next }) }).catch(() => null);
  };
  return <TodayList steps={steps} done={done} total={steps.length} onToggle={toggle} showLink />;
}
