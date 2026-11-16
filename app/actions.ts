"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { toCountryCode } from "@/lib/countries";
import { createClient, isConfigured } from "@/lib/supabase/server";

export async function setCountry(code: string) {
  const c = toCountryCode(code);
  if (!c) return;
  (await cookies()).set("country", c, { path: "/", maxAge: 31536000, sameSite: "lax" });
  if (isConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ country: c }).eq("id", user.id);
  }
  revalidatePath("/", "layout");
}
