import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button, Card } from "@/components/ui";

async function update(fd: FormData) {
  "use server";
  const pw = String(fd.get("password") || "");
  if (pw.length < 8) redirect("/reset-password?e=1");
  const s = await createClient();
  await s.auth.updateUser({ password: pw });
  redirect("/dashboard");
}

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-4 text-3xl font-bold">Set a new password</h1>
      <Card>
        <form action={update} className="space-y-4">
          {e && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Password must be at least 8 characters.</p>}
          <div><label htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={8} required className="mt-1.5" /></div>
          <Button type="submit">Save password</Button>
        </form>
      </Card>
    </div>
  );
}
