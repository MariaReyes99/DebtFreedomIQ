import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin, adminClient } from "@/lib/session";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";
import AdminNav from "@/components/AdminNav";
import { crisisReasons } from "@/lib/crisis";
import type { AssessmentInput } from "@/lib/types";
import { cancelPlan, extendPlan, grantAccess } from "../../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer" };

const d = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "—");
const money = (minor: number, cur: string | null) => `${(cur ?? "").toUpperCase()} ${(minor / 100).toFixed(2)}`;
const btn = "rounded-full px-3 py-1.5 text-xs font-semibold";

/** One customer, for support: plan, payments, latest check (scores only), messages, and actions. */
export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = adminClient();
  const [{ data: p }, { data: subs }, { data: pays }, { data: checks }, { data: msgs }, { data: log }] = await Promise.all([
    db.from("profiles").select("*").eq("id", id).maybeSingle(),
    db.from("subscriptions").select("*").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("payments").select("amount,currency,status,description,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("financial_assessments").select("created_at,health_score,stress_score,input").eq("user_id", id).order("created_at", { ascending: false }).limit(5),
    db.from("support_messages").select("id,topic,message,status,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("admin_audit").select("admin_email,action,detail,created_at").eq("target_user", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!p) notFound();
  const latest = checks?.[0];
  const crisis = latest ? crisisReasons(latest.input as AssessmentInput) : [];
  const active = (subs ?? []).filter(s => s.status === "active" || s.status === "past_due");
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader eyebrow="Admin · Customer" title={p.full_name || p.email || "Customer"}>{p.email} · {p.country ?? "no country"} · joined {d(p.created_at)} · last login {d(p.last_login_at)}</PageHeader>
      <AdminNav current="/admin/customers" />
      {crisis.length > 0 && <p className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><strong>In crisis at their last check:</strong> {crisis.join(", ")}. Crisis support is free for them automatically. Be gentle, and point to the free helplines.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Plan" value={active.length ? active.map(s => (s.tier === "premium_plus" ? "Premium Plus" : "Premium")).join(" + ") : "Free"} />
        <StatCard label="Total paid" value={(pays ?? []).filter(x => x.status === "paid").reduce((a, x) => a + x.amount, 0) ? money((pays ?? []).filter(x => x.status === "paid").reduce((a, x) => a + x.amount, 0), pays?.[0]?.currency ?? null) : "—"} />
        <StatCard label="Latest check" value={latest ? `Health ${latest.health_score} · Stress ${latest.stress_score}` : "None yet"} sub={latest ? d(latest.created_at) : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-bold">Plans</h2>
          <ul className="mt-3 space-y-3">
            {(subs ?? []).map(s => (
              <li key={s.id} className="rounded-xl border border-navy-100 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{s.tier === "premium_plus" ? "Premium Plus" : "Premium"} <span className="font-normal text-navy-500">via {s.provider}</span></span>
                  <Badge tone={s.status === "active" ? "green" : s.status === "past_due" ? "red" : "gray"}>{s.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-1 text-navy-600">Started {d(s.created_at)}{s.current_period_end ? ` · runs to ${d(s.current_period_end)}` : ""}</p>
                {(s.status === "active" || s.status === "past_due") && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {s.tier === "premium_plus" && (
                      <form action={extendPlan} className="flex items-center gap-1"><input type="hidden" name="user" value={id} /><input type="hidden" name="sub" value={s.id} /><input name="days" type="number" min={1} max={400} defaultValue={30} className="w-20 py-1" aria-label="Days to add" /><button className={`${btn} bg-teal-600 text-white`}>Extend</button></form>
                    )}
                    <form action={cancelPlan}><input type="hidden" name="user" value={id} /><input type="hidden" name="sub" value={s.id} /><button className={`${btn} border border-red-300 text-red-700`}>Cancel (stops renewals)</button></form>
                  </div>
                )}
              </li>
            ))}
            {!subs?.length && <li className="text-sm text-navy-500">No plans. They&apos;re on Free.</li>}
          </ul>
          <form action={grantAccess} className="mt-4 space-y-2 rounded-xl bg-navy-50 p-3 text-sm">
            <p className="font-semibold">Give free access</p>
            <input type="hidden" name="user" value={id} />
            <div className="flex flex-wrap gap-2">
              <select name="tier" className="w-auto"><option value="premium">Premium</option><option value="premium_plus">Premium Plus (1 year)</option></select>
              <input name="reason" placeholder="Reason (e.g. hardship, refund, partner)" maxLength={300} className="flex-1" required />
              <button className={`${btn} bg-navy-900 text-white`}>Give access</button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="font-bold">Payments</h2>
          <table className="mt-3 w-full text-sm"><tbody>
            {(pays ?? []).map((x, k) => <tr key={k} className="border-t border-navy-100"><td className="py-1.5">{d(x.created_at)}</td><td>{x.description}</td><td className="text-right">{money(x.amount, x.currency)}</td><td className="text-right">{x.status === "paid" ? <Badge tone="green">Paid</Badge> : <Badge tone="red">{x.status}</Badge>}</td></tr>)}
            {!pays?.length && <tr><td className="py-2 text-navy-500">No payments.</td></tr>}
          </tbody></table>
          <p className="mt-2 text-xs text-navy-500">Refunds are made in your Stripe Dashboard → Payments. Then cancel the plan here.</p>
        </Card>

        <Card>
          <h2 className="font-bold">Messages</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(msgs ?? []).map(m => <li key={m.id} className="rounded-xl border border-navy-100 p-2"><span className="text-xs text-navy-500">{d(m.created_at)} · {m.topic} · {m.status}</span><p className="line-clamp-3">{m.message}</p></li>)}
            {!msgs?.length && <li className="text-navy-500">No messages.</li>}
          </ul>
          <Link href="/admin/support" className="mt-2 inline-block text-sm font-semibold text-teal-700">Open the inbox →</Link>
        </Card>

        <Card>
          <h2 className="font-bold">Admin actions on this customer</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {(log ?? []).map((l, k) => <li key={k}><span className="text-navy-500">{d(l.created_at)}</span> · {l.action.replace(/_/g, " ")} by {l.admin_email}{l.detail && (l.detail as { reason?: string }).reason ? ` (${(l.detail as { reason?: string }).reason})` : ""}</li>)}
            {!log?.length && <li className="text-navy-500">None.</li>}
          </ul>
          <p className="mt-3 text-xs text-navy-500">For privacy, their full financial details aren&apos;t shown here. If they ask you to look at something specific, ask them to send it through Contact support.</p>
        </Card>
      </div>
    </div>
  );
}
