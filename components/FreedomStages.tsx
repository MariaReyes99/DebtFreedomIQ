"use client";
import { useState } from "react";
import type { FreedomPlan, PlanStep } from "@/lib/freedom";
import { COUNTRIES, money, type CountryCode } from "@/lib/countries";
import { Badge, Button, Card, cx } from "./ui";

const SRC: Record<PlanStep["source"], { label: string; tone: "teal" | "navy" | "amber" | "gray" }> = {
  essential: { label: "Do first", tone: "navy" }, "your-choice": { label: "Your choice", tone: "teal" },
  suggested: { label: "Suggested", tone: "amber" }, check: { label: "Check your numbers", tone: "gray" },
};
const dateText = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });

export default function FreedomStages({ plan, planId, initialDone, countryCode }: { plan: FreedomPlan; planId: string; initialDone: string[]; countryCode: CountryCode }) {
  const c = COUNTRIES[countryCode];
  const f = (v: number) => money(c, v);
  const [done, setDone] = useState<string[]>(initialDone);
  const [saving, setSaving] = useState(false);
  const toggle = async (id: string) => {
    const next = done.includes(id) ? done.filter(x => x !== id) : [...done, id];
    setDone(next); setSaving(true);
    await fetch("/api/plan/steps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, done: next }) }).catch(() => null);
    setSaving(false);
  };
  const allSteps = [...plan.stabilise.steps, ...plan.buffer.steps];
  const doneCount = allSteps.filter(s => done.includes(s.id)).length;
  const today = new Date().toISOString().slice(0, 10);
  const s1 = plan.stabilise, b = plan.buffer;
  const s1Done = !s1.needed || plan.after.surplus >= 0;
  const covered = s1.closedByChoices + s1.closedBySuggestions;

  const StepList = ({ steps }: { steps: PlanStep[] }) => (
    <ol className="mt-4 space-y-2">
      {steps.map(st => {
        const isDone = done.includes(st.id), late = !isDone && st.due < today;
        return (
          <li key={st.id} className={cx("rounded-xl border p-3", isDone ? "border-emerald-200 bg-emerald-50/60" : late ? "border-red-200 bg-red-50/50" : "border-navy-100 bg-white")}>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={isDone} onChange={() => toggle(st.id)} className="mt-1 h-5 w-5 accent-teal-600" />
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cx("font-semibold", isDone && "text-navy-500 line-through")}>{st.title}</span>
                  <Badge tone={SRC[st.source].tone}>{SRC[st.source].label}</Badge>
                </span>
                {st.detail && !isDone && <span className="mt-1 block text-sm text-navy-600">{st.detail}</span>}
                <span className="mt-1 flex flex-wrap gap-x-4 text-xs">
                  <span className={cx("font-semibold", late ? "text-red-700" : "text-navy-500")}>{late ? "Overdue: " : "By "}{dateText(st.due)}</span>
                  {st.monthly ? <span className="font-semibold text-emerald-700">+{f(st.monthly)}/month</span> : null}
                  {st.oneOff ? <span className="font-semibold text-emerald-700">{f(st.oneOff)} one-off</span> : null}
                  {st.href && !isDone && <a href={st.href} className="font-semibold text-teal-700 hover:underline">{st.href === "/whatif" ? "Test it in the Simulator →" : "Fix it →"}</a>}
                </span>
              </span>
            </label>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className="space-y-6">
      {/* Where you are and the destination */}
      <Card className="bg-gradient-to-br from-navy-900 to-navy-800 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="teal">Your Freedom Plan</Badge>
            <p className="mt-3 text-2xl font-bold leading-snug">{s1.needed ? (plan.after.surplus >= 0 ? `Your choices close your ${f(s1.gap)}/month gap. Now follow the steps.` : `First, close your ${f(s1.gap)}/month gap${s1.decideBy ? ` before ${dateText(s1.decideBy)}` : ""}.`) : b.status === "done" ? "You're stable with a buffer. Time to pay debt down faster." : "You're not short each month. Next: build your safety buffer."}</p>
            <p className="mt-2 max-w-3xl text-navy-100">{plan.hasChoices ? "Built from the choices you picked in the Simulator." : "No Simulator choices yet, so we've suggested the options that close your gap fastest."} Tick steps off as you go; dates are deadlines, not advice.</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-3 text-center"><p className="text-3xl font-bold">{doneCount}/{allSteps.length}</p><p className="text-xs text-navy-200">steps done{saving ? " · saving…" : ""}</p></div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-teal-400" style={{ width: `${allSteps.length ? (doneCount / allSteps.length) * 100 : 0}%` }} /></div>
        <div className="no-print mt-4 flex flex-wrap gap-2"><Button href="/whatif" size="sm" variant="secondary">🧪 {plan.hasChoices ? "Change my choices" : "Choose my moves in the Simulator"}</Button><Button href="/health?edit=1" size="sm" variant="secondary">↻ Update my numbers</Button><Button size="sm" variant="secondary" onClick={() => window.print()}>⬇ Download PDF</Button></div>
      </Card>

      {/* Stage 1 */}
      <Card as="section" className={cx(s1.needed && !s1Done ? "border-2 border-red-200" : "")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Stage 1 · Stabilise: stop the money running out</h2>
          {s1Done ? <Badge tone="green">{s1.needed ? "Gap closed by your plan" : "Not needed ✓"}</Badge> : <Badge tone="red">Urgent</Badge>}
        </div>
        {s1.needed ? (<>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-red-50 p-3"><p className="text-xs text-red-800">Short each month now</p><p className="text-xl font-bold text-red-700">{f(s1.gap)}</p></div>
            <div className="rounded-xl bg-navy-50 p-3"><p className="text-xs text-navy-600">Cash runs out</p><p className="text-xl font-bold">{plan.before.runOutDate ? dateText(plan.before.runOutDate) : "—"}</p></div>
            <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-800">This plan closes</p><p className="text-xl font-bold text-emerald-700">{f(Math.min(covered, s1.gap))}{covered < s1.gap ? ` of ${f(s1.gap)}` : " ✓"}</p></div>
          </div>
          {covered < s1.gap && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">These steps don&apos;t fully close the gap yet. Try more options in the Simulator, and talk to {c.firstCall.name} about what else is possible.</p>}
          <StepList steps={s1.steps} />
        </>) : <p className="mt-2 text-navy-600">More comes in than goes out each month. Keep it that way.</p>}
      </Card>

      {/* Stage 2 */}
      <Card as="section">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Stage 2 · Build a safety buffer</h2>
          {b.status === "done" ? <Badge tone="green">Done ✓</Badge> : b.status === "on-track" ? <Badge tone="teal">On track</Badge> : <Badge tone="gray">Starts after Stage 1</Badge>}
        </div>
        <p className="mt-2 text-navy-600">Target: <strong>{f(b.target)}</strong>, about 3 months of living costs and repayments. You have {f(b.have)}{b.reachedBy && b.status === "on-track" ? `; at your spare ${f(plan.after.surplus)}/month you'd reach it around ${dateText(b.reachedBy)}` : ""}.</p>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-navy-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, b.target ? (b.have / b.target) * 100 : 100)}%` }} /></div>
        {b.steps.length > 0 && <StepList steps={b.steps} />}
      </Card>
    </div>
  );
}
