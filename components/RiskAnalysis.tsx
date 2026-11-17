"use client";
import { useEffect, useState } from "react";
import type { AssessmentInput } from "@/lib/types";
import { toHousehold } from "@/lib/library";
import { projectHousehold, type HouseholdInput } from "@/lib/projection/household";
import { analyseHousehold, type HouseholdAnalysis } from "@/lib/projection/analysis";
import { Card, cx } from "./ui";

/** Strengths, weaknesses and risks of the finances, now and with the chosen moves (Investment Library engine). */
export default function RiskAnalysis({ before, after, changed, ages }: { before: AssessmentInput; after: AssessmentInput; changed: boolean; ages: { age: number; retireAge?: number } }) {
  const [view, setView] = useState<"after" | "now">("after");
  const [res, setRes] = useState<{ now: HouseholdAnalysis | null; after: HouseholdAnalysis | null }>({ now: null, after: null });
  const [busy, setBusy] = useState(true);
  const run = (i: AssessmentInput) => { try { return analyseHousehold(projectHousehold(toHousehold(i, ages) as HouseholdInput, { monteCarlo: true })); } catch { return null; } };
  // "Now" only changes with the numbers or ages
  useEffect(() => { const t = setTimeout(() => { setRes(r => ({ ...r, now: run(before) })); setBusy(false); }, 50); return () => clearTimeout(t); }, [before, ages.age, ages.retireAge]); // eslint-disable-line react-hooks/exhaustive-deps
  // "With your choices": wait until typing pauses; each analysis runs a few hundred simulated markets
  useEffect(() => {
    if (!changed) { setRes(r => ({ ...r, after: null })); return; }
    setBusy(true);
    const t = setTimeout(() => { setRes(r => ({ ...r, after: run(after) })); setBusy(false); }, 700);
    return () => clearTimeout(t);
  }, [after, changed, ages.age, ages.retireAge]); // eslint-disable-line react-hooks/exhaustive-deps
  const a = view === "after" && changed ? res.after : res.now;
  const groups: [string, string, string, keyof Pick<HouseholdAnalysis, "strengths" | "weaknesses" | "risks">][] = [["✅", "Strengths", "border-emerald-200 bg-emerald-50/50", "strengths"], ["⚠️", "Weaknesses", "border-amber-200 bg-amber-50/50", "weaknesses"], ["🌩️", "Risks", "border-red-200 bg-red-50/40", "risks"]];
  return (
    <Card as="section">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Strengths, weaknesses &amp; risks</h2>
        {changed && <div className="flex rounded-full bg-navy-50 p-1 text-sm" role="tablist">{(["after", "now"] as const).map(v => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cx("rounded-full px-3 py-1 font-semibold", view === v ? "bg-white shadow" : "text-navy-500")}>{v === "after" ? "With your choices" : "Now"}</button>)}</div>}
      </div>
      {busy && !a ? <p className="mt-3 text-sm text-navy-500">Analysing…</p> : !a ? <p className="mt-3 text-sm text-navy-500">Couldn&apos;t analyse these numbers.</p> : (
        <div className={cx("mt-3 space-y-2", busy && "opacity-60")}>
          {groups.map(([icon, title, cls, key]) => (
            <details key={key} className={cx("group rounded-xl border", cls)} open={key === "risks" && a[key].length > 0 && a[key].length <= 2}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold">
                <span>{icon} {a[key].length} {title.toLowerCase()}{a[key][0] ? <span className="ml-2 hidden font-normal text-navy-600 sm:inline">· {a[key][0].title}{a[key].length > 1 ? " …" : ""}</span> : null}</span>
                <span className="text-sm text-teal-700 group-open:hidden">Show</span><span className="hidden text-sm text-teal-700 group-open:inline">Hide</span>
              </summary>
              <ul className="space-y-2 px-4 pb-3 text-sm">{a[key].length ? a[key].map(x => <li key={x.title}><strong>{x.title}.</strong> <span className="text-navy-700">{x.detail}</span></li>) : <li className="text-navy-500">None found.</li>}</ul>
            </details>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-navy-500">From the Investment Research Library&apos;s analysis: 300 simulated markets, today&apos;s money. Retirement figures don&apos;t include NZ Super or other pensions unless added in the Library.</p>
    </Card>
  );
}
