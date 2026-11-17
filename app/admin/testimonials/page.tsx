import { notFound } from "next/navigation";
import { isAdmin, adminClient } from "@/lib/session";
import { Badge, Card, PageHeader } from "@/components/ui";
import AdminNav from "@/components/AdminNav";
import { setTestimonial } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stories" };

export default async function Testimonials() {
  if (!(await isAdmin())) notFound();
  const { data } = await adminClient().from("testimonials").select("*").order("created_at", { ascending: false }).limit(300);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader eyebrow="Admin" title="Stories">Stories people shared with permission. Approved ones appear on the Pricing page. Check each one is real, kind and doesn&apos;t identify anyone.</PageHeader>
      <AdminNav current="/admin/testimonials" />
      <div className="space-y-4">
        {(data ?? []).map(t => (
          <Card key={t.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{t.display_name || "Anonymous"}{t.country ? ` · ${t.country}` : ""} <span className="text-xs font-normal text-navy-500">{new Date(t.created_at).toLocaleDateString("en-NZ")}</span></p>
              <Badge tone={t.approved ? "green" : "gray"}>{t.approved ? "Shown" : "Waiting"}</Badge>
            </div>
            {t.outcome && <p className="mt-2 font-semibold text-teal-800">{t.outcome}</p>}
            <p className="mt-1 whitespace-pre-wrap text-[15px]">{t.story}</p>
            <div className="mt-3 flex gap-2">
              <form action={setTestimonial}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="approved" value={t.approved ? "false" : "true"} /><button className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white">{t.approved ? "Hide" : "Approve and show"}</button></form>
              <form action={setTestimonial}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="delete" value="true" /><button className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700">Delete</button></form>
            </div>
          </Card>
        ))}
        {!data?.length && <Card className="text-center text-navy-500">No stories yet. People can share one from their Home page.</Card>}
      </div>
    </div>
  );
}
