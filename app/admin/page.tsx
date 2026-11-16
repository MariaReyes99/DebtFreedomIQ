import { notFound } from "next/navigation";
import { isAdmin, adminClient } from "@/lib/session";
import { Card, PageHeader, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights" };

export default async function Admin() {
  if (!(await isAdmin())) notFound();
  const db = adminClient();
  const [{ data: ev }, { data: assessments }, { data: debts }, { data: subs }] = await Promise.all([
    db.from("events").select("name,anon_id,user_id,country,props").limit(50000),
    db.from("financial_assessments").select("health_score,stress_score,situation,country,user_id").limit(50000),
    db.from("debts").select("type,balance").limit(100000),
    db.from("subscriptions").select("tier,provider,amount,currency"),
  ]);
  const uniq = (n: string) => new Set((ev ?? []).filter(e => e.name === n).map(e => e.user_id || e.anon_id)).size;
  const completed = (ev ?? []).filter(e => e.name === "assessment_completed");
  const people = new Set(completed.map(e => e.user_id || e.anon_id)).size;
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const healths = completed.map(e => Number((e.props as { health?: number })?.health ?? 0));
  const debtTypes: Record<string, number> = {};
  completed.forEach(e => ((e.props as { debtTypes?: string[] })?.debtTypes ?? []).forEach(t => (debtTypes[t] = (debtTypes[t] || 0) + 1)));
  const helpCats: Record<string, number> = {};
  (ev ?? []).filter(e => e.name === "brief_generated").forEach(e => ((e.props as { categories?: string[] })?.categories ?? []).forEach(c => (helpCats[c] = (helpCats[c] || 0) + 1)));
  const flags: Record<string, number> = {};
  (assessments ?? []).forEach(a => Object.entries(a.situation ?? {}).forEach(([k, v]) => { if (v) flags[k] = (flags[k] || 0) + 1; }));
  const funnel = [["Landing visitors", uniq("landing_view")], ["Started health check", uniq("assessment_started")], ["Completed health check", people], ["Signed up", uniq("signup")], ["Viewed Premium", uniq("premium_view")], ["Started checkout", uniq("checkout_started")], ["Bought Premium", uniq("purchase")], ["Premium Plus waitlist", uniq("plus_waitlist")]] as const;
  const bar = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const max = (o: Record<string, number>) => Math.max(1, ...Object.values(o));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <PageHeader eyebrow="Admin" title="Learning from your first 100 users">Goal: 100 people through Financial Health. Then decide what to build and charge for.</PageHeader>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="People completed check" value={`${people} / 100`} tone={people >= 100 ? "good" : "navy"} />
        <StatCard label="Avg health score" value={avg(healths)} />
        <StatCard label="Premium buyers" value={(subs ?? []).filter(s => s.provider !== "waiver").length} sub={`${(subs ?? []).filter(s => s.provider === "waiver").length} took free hardship access`} />
        <StatCard label="Check → Premium" value={people ? `${(((subs ?? []).length / people) * 100).toFixed(1)}%` : "—"} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card><h2 className="font-bold">Funnel</h2><table className="mt-3 w-full text-sm"><tbody>{funnel.map(([l, v], i) => <tr key={l} className="border-t border-navy-100"><td className="py-2">{l}</td><td className="text-right font-bold">{v}</td><td className="w-20 text-right text-navy-500">{i && funnel[i - 1][1] ? `${Math.round((v / funnel[i - 1][1]) * 100)}%` : ""}</td></tr>)}</tbody></table></Card>
        <Card><h2 className="font-bold">What debts do people have?</h2><ul className="mt-3 space-y-2">{bar(debtTypes).map(([k, v]) => <li key={k}><div className="flex justify-between text-sm"><span className="capitalize">{k.replace("_", " ")}</span><span>{v}</span></div><div className="h-2 rounded-full bg-navy-100"><div className="h-full rounded-full bg-teal-500" style={{ width: `${(v / max(debtTypes)) * 100}%` }} /></div></li>)}{!Object.keys(debtTypes).length && <li className="text-sm text-navy-500">No data yet.</li>}</ul></Card>
        <Card><h2 className="font-bold">What situations are people in?</h2><ul className="mt-3 space-y-2">{bar(flags).map(([k, v]) => <li key={k} className="flex justify-between text-sm"><span>{k.replace(/([A-Z])/g, " $1").toLowerCase()}</span><span className="font-bold">{v}</span></li>)}{!Object.keys(flags).length && <li className="text-sm text-navy-500">No data yet.</li>}</ul></Card>
        <Card><h2 className="font-bold">What help do they need?</h2><ul className="mt-3 space-y-2">{bar(helpCats).map(([k, v]) => <li key={k} className="flex justify-between text-sm"><span className="capitalize">{k.replace("_", " ")}</span><span className="font-bold">{v}</span></li>)}{!Object.keys(helpCats).length && <li className="text-sm text-navy-500">Appears when Premium users generate referral briefs.</li>}</ul></Card>
      </div>
    </div>
  );
}
