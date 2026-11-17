import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin, adminClient } from "@/lib/session";
import { Card, PageHeader } from "@/components/ui";
import AdminNav from "@/components/AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };

export default async function Audit() {
  if (!(await isAdmin())) notFound();
  const { data } = await adminClient().from("admin_audit").select("*").order("created_at", { ascending: false }).limit(300);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader eyebrow="Admin" title="Audit log">Every change made in the admin area: who, what and when. It can&apos;t be edited from the app.</PageHeader>
      <AdminNav current="/admin/audit" />
      <Card>
        <table className="w-full text-left text-sm">
          <thead><tr className="text-navy-500"><th className="py-2">When</th><th>Admin</th><th>Action</th><th>Customer</th><th>Details</th></tr></thead>
          <tbody>
            {(data ?? []).map(r => (
              <tr key={r.id} className="border-t border-navy-100 align-top">
                <td className="py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-NZ")}</td><td>{r.admin_email}</td><td>{r.action.replace(/_/g, " ")}</td>
                <td>{r.target_user ? <Link href={`/admin/customers/${r.target_user}`} className="text-teal-700">View</Link> : "—"}</td>
                <td className="max-w-xs break-words text-xs text-navy-600">{r.detail ? JSON.stringify(r.detail) : ""}</td>
              </tr>
            ))}
            {!data?.length && <tr><td colSpan={5} className="py-6 text-center text-navy-500">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
