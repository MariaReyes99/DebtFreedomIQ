const STEPS = [
  { t: "Tell us your numbers", d: "Income, spending, debts, assets and savings. Rough figures are fine." },
  { t: "Get your scores", d: "Financial Health, Stress, Emergency Fund, net worth and debt-to-income." },
  { t: "See your next steps", d: "Your top 5 recommendations and who can help, matched to your situation." },
  { t: "Build your Freedom Plan", d: "Optional Premium: three payoff scenarios with milestones and a PDF." },
];
export default function Steps() {
  return (
    <section aria-labelledby="how" className="border-b border-teal-100 bg-teal-50/70">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <h2 id="how" className="text-xs font-bold uppercase tracking-widest text-teal-700">How it works · 4 simple steps</h2>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="flex gap-3 rounded-xl bg-white p-3 shadow-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500 text-sm font-bold text-white">{i + 1}</span>
              <div><p className="font-semibold leading-tight">{s.t}</p><p className="mt-0.5 hidden text-sm text-navy-600 sm:block">{s.d}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
