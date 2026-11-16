"use client";
import { useState } from "react";

export default function CopyBox({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <button className="no-print rounded-full border border-navy-200 px-3 py-1 text-sm font-semibold text-navy-700 hover:bg-navy-50" onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>{copied ? "Copied ✓" : "Copy"}</button>
      </div>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-navy-100 bg-navy-50 p-4 font-sans text-sm leading-relaxed text-navy-800">{text}</pre>
    </div>
  );
}
