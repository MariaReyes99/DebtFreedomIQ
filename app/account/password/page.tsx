import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function update(fd: FormData) {
  "use server";
  const pw = String(fd.get("password") || "");
  if (pw.length < 8) redirect("/account/password?e=1");
  const s = await createClient();
  await s.auth.updateUser({ password: pw });
  redirect("/");
}

export default async function Password({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <div className="wrap section narrow">
      <h1>Set a new password</h1>
      <form action={update} className="card">
        {e && <p className="error">Password must be at least 8 characters.</p>}
        <div className="field"><label htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={8} required /></div>
        <button className="btn">Save password</button>
      </form>
    </div>
  );
}
