"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Thin bar at the top of the screen from the moment a link is clicked until the new page is showing. */
export default function NavProgress() {
  const path = usePathname(), search = useSearchParams();
  const [busy, setBusy] = useState(false);
  useEffect(() => { setBusy(false); }, [path, search]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      setBusy(true);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  if (!busy) return null;
  return <div aria-hidden className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-teal-100"><div className="h-full w-1/3 animate-[navbar_1s_ease-in-out_infinite] bg-teal-500" /></div>;
}
