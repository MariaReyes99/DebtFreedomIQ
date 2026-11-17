import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin, adminClient } from "@/lib/session";
import { Card, PageHeader } from "@/components/ui";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers" };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!(await isAdmin())) notFound();
  const { q = "" } = await searchParams;
  const needle = q.trim().replace(/[%,()]/g, "").slice(0, 100);
  const db = adminClient();
  let query = db.from("profiles").select("id,email,full_name,country,created_at,last_login_at").order("created_at", { ascending: false }).limit(100);
  if (needle) query = query.or(`email.ilike.%${needle}%,full_name.ilike.%${needle}%`);
  const [{ data: people }, { data: subs }] = await Promise.all([query, db.from("subscriptions").select("user_id,tier,status").in("status", ["active", "past_due"])]);
  const plan = new Map<string, string>();
  (subs ?? []).forEach(s => plan.set(s.user_id, `${s.tier === "premium_plus" ? "Premium Plus" : plan.get(s.user_id) === "Premium Plus" ? "Premium Plus" : "Premium"}${s.status === "past_due" ? " (on hold)" : ""}`));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader eyebrow="Admin" title="Customers">Find a customer to see their plan, payments and messages, and to help them.</PageHeader>
      <AdminNav current="/admin/customers" />
      <Card>
        <form action="/admin/customers" className="flex gap-2"><input name="q" defaultValue={q} placeholder="Search by email or name" className="flex-1" aria-label="Search customers" /><button className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Search</button></form>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead><tr className="text-navy-500"><th className="py-2">Name</th><th>Email</th><th>Country</th><th>Plan</th><th>Joined</th><th>Last login</th></tr></thead>
            <tbody>
              {(people ?? []).map(p => (
                <tr key={p.id} className="border-t border-navy-100">
                  <td className="py-2"><Link href={`/admin/customers/${p.id}`} className="font-semibold text-teal-700 hover:underline">{p.full_name || "(no name)"}</Link></td>
                  <td>{p.email}</td><td>{p.country ?? "—"}</td><td>{plan.get(p.id) ?? "Free"}</td>
                  <td>{new Date(p.created_at).toLocaleDateString("en-NZ")}</td><td>{p.last_login_at ? new Date(p.last_login_at).toLocaleDateString("en-NZ") : "—"}</td>
                </tr>
              ))}
              {!people?.length && <tr><td colSpan={6} className="py-6 text-center text-navy-500">No customers found.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
