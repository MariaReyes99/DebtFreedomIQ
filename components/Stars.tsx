/** 1–5 rating shown as filled dots, with a text label for screen readers. */
export default function Stars({ value, label, tone = "navy" }: { value: number; label: string; tone?: "navy" | "amber" }) {
  return (
    <span className="inline-flex items-center gap-1" title={`${label}: ${value} of 5`}>
      <span className="text-navy-500">{label}</span>
      <span aria-hidden className={tone === "amber" ? "text-amber-500" : "text-navy-700"}>{"●".repeat(value)}<span className="text-navy-200">{"●".repeat(5 - value)}</span></span>
      <span className="sr-only">{value} of 5</span>
    </span>
  );
}
