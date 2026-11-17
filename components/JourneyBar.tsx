"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type J = { hasCheck: boolean; hasPlan: boolean; ticked: number; seenHelp: boolean };
const SHOW_ON = ["/dashboard", "/health", "/help", "/plan", "/whatif"];
const KEY = "dfiq_journey";

/** The guided path shown on the main pages: Check → Understand → Get help → Plan → Track. */
export default function JourneyBar() {
  const path = usePathname();
  const [j, setJ] = useState<J | null>(null);
  useEffect(() => {
    let seenHelp = false;
    try { if (path.startsWith("/help")) localStorage.setItem("dfiq_seen_help", "1"); seenHelp = localStorage.getItem("dfiq_seen_help") === "1"; } catch { /* ignore */ }
    let cached: J | null = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch { /* ignore */ }
    if (cached) setJ({ ...cached, seenHelp });
    // Refresh in the background (after a check is saved or a step is ticked)
    fetch("/api/journey").then(r => r.json()).then(d => {
      let pending = false;
      try { pending = Boolean(localStorage.getItem("dfiq_pending_assessment")); } catch { /* ignore */ }
      const next = { hasCheck: Boolean(d.hasCheck) || pending, hasPlan: Boolean(d.hasPlan), ticked: Number(d.ticked) || 0, seenHelp };
      setJ(next);
      try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    }).catch(() => null);
  }, [path]);
  if (!SHOW_ON.some(p => path === p || path.startsWith(p + "/"))) return null;
  const steps = [
    { n: 1, label: "Check", long: "Check my finances", href: "/health?edit=1", done: !!j?.hasCheck, here: path.startsWith("/health") && !j?.hasCheck },
    { n: 2, label: "Understand", long: "Understand my situation", href: "/health", done: !!j?.hasCheck, here: (path.startsWith("/health") && !!j?.hasCheck) || path === "/dashboard" },
    { n: 3, label: "Get help", long: "Get help", href: "/help", done: !!j?.seenHelp, here: path.startsWith("/help") },
    { n: 4, label: "Plan", long: "Make my plan", href: "/plan", done: !!j?.hasPlan, here: path.startsWith("/plan") || path.startsWith("/whatif") },
    { n: 5, label: "Track", long: "Track my progress", href: "/plan#stage-1", done: (j?.ticked ?? 0) > 0, here: false },
  ];
  const next = steps.find(s => !s.done);
  return (
    <nav aria-label="Your journey" className="no-print border-b border-navy-100 bg-white">
      <ol className="relative mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2 text-sm">
        {steps.map((s, k) => (
          <li key={s.n} className="flex shrink-0 items-center gap-1">
            <Link href={s.href} aria-current={s.here ? "step" : undefined}
              className={`flex items-center gap-2 rounded-full px-2.5 py-1 font-semibold ${s.here ? "bg-navy-900 text-white" : s.done ? "text-teal-700 hover:bg-teal-50" : s === next ? "text-navy-900 ring-2 ring-teal-400 hover:bg-teal-50" : "text-navy-400 hover:bg-navy-50"}`}>
              <span aria-hidden className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${s.done ? "bg-teal-500 text-white" : s.here ? "bg-white text-navy-900" : "bg-navy-100 text-navy-600"}`}>{s.done ? "✓" : s.n}</span>
              <span className="sm:hidden">{s.label}</span><span className="hidden sm:inline">{s.long}</span>
              <span className="sr-only">{s.done ? " (done)" : s === next ? " (next)" : ""}</span>
            </Link>
            {k < steps.length - 1 && <span aria-hidden className="text-navy-300">→</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
