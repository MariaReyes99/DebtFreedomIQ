"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const HIDE_BACK = ["/", "/terms", "/privacy"];

/** "← Back" link under the menu on every page, plus floating "top / bottom" buttons on long pages. */
export function BackBar() {
  const router = useRouter();
  const path = usePathname();
  if (HIDE_BACK.includes(path)) return null;
  const back = () => {
    const same = document.referrer && new URL(document.referrer).origin === window.location.origin;
    if (same && window.history.length > 1) router.back(); else router.push("/");
  };
  return (
    <div className="no-print mx-auto max-w-7xl px-4 pt-4">
      <button type="button" onClick={back} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-navy-600 hover:bg-navy-100 hover:text-navy-900">← Back</button>
    </div>
  );
}

export function ScrollButtons() {
  const path = usePathname();
  const [long, setLong] = useState(false);
  const [nearTop, setNearTop] = useState(true);
  const [nearBottom, setNearBottom] = useState(false);
  useEffect(() => {
    const check = () => {
      const h = document.documentElement.scrollHeight, v = window.innerHeight, y = window.scrollY;
      setLong(h > v * 1.8);
      setNearTop(y < 200);
      setNearBottom(y + v > h - 200);
    };
    check();
    const ro = new ResizeObserver(check); ro.observe(document.body);
    window.addEventListener("scroll", check, { passive: true });
    return () => { ro.disconnect(); window.removeEventListener("scroll", check); };
  }, [path]);
  if (!long) return null;
  const btn = "flex h-11 w-11 items-center justify-center rounded-full bg-navy-900 text-lg text-white shadow-lg ring-2 ring-white hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-teal-400";
  return (
    <div className="no-print fixed bottom-5 right-5 z-40 flex flex-col gap-2">
      {!nearTop && <button type="button" aria-label="Go to top of page" title="Go to top" className={btn} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>}
      {!nearBottom && <button type="button" aria-label="Go to bottom of page" title="Go to bottom" className={btn} onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" })}>↓</button>}
    </div>
  );
}
