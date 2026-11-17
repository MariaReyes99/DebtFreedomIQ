/** Shown straight away while the next page loads, so a menu click always responds at once. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="h-4 w-24 animate-pulse rounded bg-navy-100" />
      <div className="mt-3 h-9 w-72 max-w-full animate-pulse rounded-lg bg-navy-100" />
      <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-navy-100" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map(k => <div key={k} className="h-36 animate-pulse rounded-2xl border border-navy-100 bg-white" />)}
      </div>
    </div>
  );
}
