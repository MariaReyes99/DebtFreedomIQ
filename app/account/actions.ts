"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { toCountryCode } from "@/lib/countries";

export type FormState = { ok?: string; error?: string };

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in again." };
  const full_name = String(fd.get("full_name") || "").trim().slice(0, 80);
  const country = toCountryCode(String(fd.get("country") || ""));
  if (!country) return { error: "Please choose your country from the list." };
  const { error } = await supabase.from("profiles").update({ full_name: full_name || null, country }).eq("id", user.id);
  if (error) return { error: "Couldn't save your profile. Please try again." };
  await supabase.auth.updateUser({ data: { full_name, country } });
  (await cookies()).set("country", country, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
  return { ok: "Profile saved." };
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Please log in again." };
  const current = String(fd.get("current") || "");
  const next = String(fd.get("new") || "");
  const confirm = String(fd.get("confirm") || "");
  if (next.length < 8) return { error: "Your new password must be at least 8 characters." };
  if (next !== confirm) return { error: "The new passwords don't match." };
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (signInError) return { error: "Your current password is incorrect." };
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };
  return { ok: "Password changed." };
}
