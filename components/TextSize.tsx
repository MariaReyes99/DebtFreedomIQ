"use client";
import { useEffect, useState } from "react";

const KEY = "dfiq_text_size";

/** Standard / Large text, remembered on this device. Everything is sized in rem, so the whole app scales. */
export default function TextSize() { return null; }

export function TextSizeButton() {
  const [large, setLarge] = useState(false);
  useEffect(() => { setLarge(document.documentElement.classList.contains("large-text")); }, []);
  const toggle = () => {
    const next = !large;
    setLarge(next);
    document.documentElement.classList.toggle("large-text", next);
    try { localStorage.setItem(KEY, next ? "large" : "standard"); } catch { /* ignore */ }
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={large} title={large ? "Standard text size" : "Larger text"}
      className="rounded-full border border-navy-200 bg-white px-2.5 py-1.5 text-sm font-bold text-navy-700 hover:border-teal-400 hover:text-teal-700">
      <span aria-hidden>A</span><span aria-hidden className="text-base">A</span><span className="sr-only">{large ? "Switch to standard text size" : "Switch to larger text"}</span>
    </button>
  );
}

/** Runs before the page paints, so there's no flash of small text. */
export const textSizeScript = `try{if(localStorage.getItem("${KEY}")==="large")document.documentElement.classList.add("large-text")}catch(e){}`;
