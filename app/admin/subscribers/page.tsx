import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin, adminClient } from "@/lib/session";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subscribers" };

type Sub = { id: string; user_id: string; tier: string; status: string; provider: string; provider_ref: string | null; amount: number | null; currency: string | null; current_period_end: string | null; past_due_since: string | null; reminders_sent: number | null; cancelled_at: string | null; created_at: string };
type Pay = { user_id: string; subscription_id: string | null; amount: number; currency: string | null; status: string; created_at: string };

const FILTERS = [["all", "All"], ["active", "Paying"], ["past_due", "On hold"], ["cancelled", "Unsubscribed"], ["expired", "Ended"], ["test", "Test (no card)"], ["waiver", "Free access (hardship or given)"]] as const;
const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "—");
const amt = (minor: number, cur: string | null) => `${(cur ?? "").toUpperCase()} ${(minor / 100).toFixed(2)}`;

export default async function Subscribers({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  if (!(await isAdmin())) notFound();
  const { f = "all", q = "" } = await searchParams;
  const db = adminClient();
  const [{ data: subs }, { data: pays }, { data: profiles }, { data: cards }] = await Promise.all([
    db.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(5000),
    db.from("payments").select("user_id,subscription_id,amount,currency,status,created_at").order("created_at", { ascending: false }).limit(50000),
    db.from("profiles").select("id,email,full_name,country,stripe_customer_id").limit(50000),
    db.from("payment_methods").select("user_id").limit(50000),
  ]);
  const people = new Map((profiles ?? []).map(p => [p.id, p]));
  const hasCard = new Set((cards ?? []).map(c => c.user_id));
  const payments = (pays ?? []) as Pay[];
  const all = (subs ?? []) as Sub[];
  const isTest = (s: Sub) => s.provider_ref?.startsWith("test_");
  const kind = (s: Sub) => (s.provider === "waiver" || s.provider === "complimentary" ? "waiver" : isTest(s) ? "test" : s.status);

  // Summary (real payments only; test and free hardship access excluded)
  const real = all.filter(s => s.provider !== "waiver" && s.provider !== "complimentary" && !isTest(s));
  const paid = payments.filter(p => p.status === "paid");
  const revenue: Record<string, number> = {};
  paid.forEach(p => { const c = (p.currency ?? "").toUpperCase(); revenue[c] = (revenue[c] || 0) + p.amount; });
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
  const monthRev: Record<string, number> = {};
  paid.filter(p => new Date(p.created_at) >= thisMonth).forEach(p => { const c = (p.currency ?? "").toUpperCase(); monthRev[c] = (monthRev[c] || 0) + p.amount; });
  const fmtMap = (o: Record<string, number>) => Object.entries(o).map(([c, v]) => `${c} ${(v / 100).toFixed(2)}`).join(" · ") || "0";

  const needle = q.trim().toLowerCase();
  const rows = all
    .filter(s => f === "all" || kind(s) === f)
    .filter(s => { if (!needle) return true; const p = people.get(s.user_id); return `${p?.email ?? ""} ${p?.full_name ?? ""}`.toLowerCase().includes(needle); });

  const badge = (s: Sub) => {
    const k = kind(s);
    if (k === "waiver") return <Badge tone="teal">Free hardship access</Badge>;
    if (k === "test") return <Badge tone="amber">Test · {s.status.replace("_", " ")}</Badge>;
    if (k === "active") return <Badge tone="green">Paying</Badge>;
    if (k === "past_due") return <Badge tone="red">On hold · {s.reminders_sent ?? 0} reminder{s.reminders_sent === 1 ? "" : "s"}</Badge>;
    if (k === "cancelled") return <Badge tone="gray">Unsubscribed {d(s.cancelled_at)}</Badge>;
    return <Badge tone="gray">Ended</Badge>;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Admin" title="Subscribers & payments">Who has subscribed, whether they&apos;re paying, and what you&apos;ve earned.</PageHeader>
      <AdminNav current="/admin/subscribers" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Paying now" value={real.filter(s => s.status === "active").length} sub={`${real.filter(s => s.status === "active" && s.tier === "premium_plus").length} Premium Plus · ${real.filter(s => s.status === "active" && s.tier === "premium").length} one-time`} tone="good" />
        <StatCard label="On hold (not paying)" value={real.filter(s => s.status === "past_due").length} tone={real.some(s => s.status === "past_due") ? "warn" : "navy"} sub="Reminders are being sent" />
        <StatCard label="Unsubscribed / ended" value={real.filter(s => s.status === "cancelled" || s.status === "expired").length} />
        <StatCard label="Received this month" value={fmtMap(monthRev)} sub={`All time: ${fmtMap(revenue)}`} />
      </div>
      <p className="mt-2 text-xs text-navy-500">Totals count only payments recorded by the app. In Stripe mode, your Stripe Dashboard → Payments is the record of money actually in your bank. Test (no card) and free hardship access are not counted as revenue.</p>

      <Card className="mt-6">
        <form className="flex flex-wrap items-center gap-2" action="/admin/subscribers">
          {FILTERS.map(([k, l]) => <Link key={k} href={`/admin/subscribers?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={`rounded-full px-3 py-1 text-sm font-semibold ${f === k ? "bg-navy-900 text-white" : "bg-navy-50 text-navy-700 hover:bg-navy-100"}`}>{l} ({k === "all" ? all.length : all.filter(s => kind(s) === k).length})</Link>)}
          <input type="hidden" name="f" value={f} />
          <input name="q" defaultValue={q} placeholder="Search name or email" className="ml-auto w-56" />
        </form>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead><tr className="text-navy-500"><th className="py-2">Person</th><th>Plan</th><th>Status</th><th>Price</th><th>Started</th><th>Next payment</th><th>Last payment</th><th>Total paid</th><th>Card on file</th></tr></thead>
            <tbody>
              {rows.map(s => {
                const p = people.get(s.user_id);
                const mine = payments.filter(x => x.subscription_id === s.id);
                const last = mine[0];
                const total = mine.filter(x => x.status === "paid").reduce((a, x) => a + x.amount, 0);
                const card = s.provider === "stripe" ? (p?.stripe_customer_id ? "Stripe" : "—") : hasCard.has(s.user_id) ? "Yes" : "No";
                return (
                  <tr key={s.id} className="border-t border-navy-100 align-top">
                    <td className="py-2"><Link href={`/admin/customers/${s.user_id}`} className="font-semibold text-teal-700 hover:underline">{p?.full_name || "(no name)"}</Link><div className="text-navy-500">{p?.email}</div><div className="text-xs text-navy-400">{p?.country}</div></td>
                    <td>{s.tier === "premium" ? "Premium (one-time)" : "Premium Plus (yearly)"}</td>
                    <td>{badge(s)}</td>
                    <td>{s.amount != null ? amt(s.amount, s.currency) : "—"}</td>
                    <td>{d(s.created_at)}</td>
                    <td>{s.tier === "premium_plus" && s.status === "active" ? d(s.current_period_end) : s.status === "past_due" ? <span className="text-red-700">Overdue since {d(s.past_due_since)}</span> : "—"}</td>
                    <td>{last ? <>{d(last.created_at)} {last.status === "paid" ? <Badge tone="green">Paid</Badge> : <Badge tone="red">Failed</Badge>}</> : "—"}</td>
                    <td className="font-semibold">{total ? amt(total, s.currency) : "—"}</td>
                    <td>{card === "No" && s.tier === "premium_plus" ? <span className="font-semibold text-red-700">No</span> : card}</td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={9} className="py-6 text-center text-navy-500">No subscribers here yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
